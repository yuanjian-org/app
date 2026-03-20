import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { listImpl, updateImpl, AI_MINUTES_SUMMARY_KEY } from "./summaries";
import User from "../../shared/User";

describe("summaries", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createTestUser(roles: any[] = []) {
    const user = await db.User.create(
      {
        email: `test-user-${Date.now()}-${Math.random()}@test.com`,
        name: "Test User",
        roles,
      },
      { transaction },
    );
    return {
      id: user.id,
      name: user.name,
      url: null,
      roles: user.roles,
      email: user.email,
      phone: user.phone,
      wechat: user.wechat,
      menteeStatus: user.menteeStatus,
      pointOfContact: null,
      pointOfContactNote: null,
    } as User;
  }

  async function createTestGroup(isPublic = true) {
    return await db.Group.create(
      {
        name: "Test Group",
        public: isPublic,
      },
      { transaction },
    );
  }

  async function createTestTranscript(groupId: string) {
    const transcriptId = `test-transcript-${Date.now()}-${Math.random()}`;
    return await db.Transcript.create(
      {
        transcriptId,
        groupId: groupId,
        startedAt: new Date(),
        endedAt: new Date(),
      },
      { transaction },
    );
  }

  async function createTestSummary(transcriptId: string, markdown: string) {
    return await db.Summary.create(
      {
        transcriptId,
        key: AI_MINUTES_SUMMARY_KEY,
        markdown,
        initialLength: markdown.length,
        deletedLength: 0,
      },
      { transaction },
    );
  }

  describe("listImpl", () => {
    it("should return the AI minutes summary for a transcript", async () => {
      const me = await createTestUser(["MentorshipManager"]);
      const group = await createTestGroup();
      await db.GroupUser.create(
        { userId: me.id, groupId: group.id },
        { transaction },
      );
      const transcript = await createTestTranscript(group.id);
      const summaryMarkdown = "This is a test summary";
      await createTestSummary(transcript.transcriptId, summaryMarkdown);

      const result = await listImpl(me, transcript.transcriptId, transaction);

      expect(result).to.have.lengthOf(1);
      expect(result[0].transcriptId).to.equal(transcript.transcriptId);
      expect(result[0].key).to.equal(AI_MINUTES_SUMMARY_KEY);
      expect(result[0].markdown).to.equal(summaryMarkdown);
    });

    it("should throw error if user has no permission to access group history", async () => {
      const me = await createTestUser(["Volunteer"]);
      const group = await createTestGroup(false);
      // User is not in the group
      const transcript = await createTestTranscript(group.id);

      try {
        await listImpl(me, transcript.transcriptId, transaction);
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        expect(error.message).to.contain("没有访问数据");
      }
    });
  });

  describe("updateImpl", () => {
    it("should throw error if user has no permission to update summary", async () => {
      const me = await createTestUser(["Volunteer"]); // Not a manager, not in group
      const group = await createTestGroup(false);
      const transcript = await createTestTranscript(group.id);
      const originalMarkdown = "Original summary text";
      await createTestSummary(transcript.transcriptId, originalMarkdown);

      const newMarkdown = "Updated summary text";

      try {
        await updateImpl(
          me,
          transcript.transcriptId,
          AI_MINUTES_SUMMARY_KEY,
          newMarkdown,
          transaction,
        );
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        expect(error.message).to.contain("没有访问数据");
      }
    });

    it("should allow updating a summary if user has permission", async () => {
      const me = await createTestUser(["GroupManager"]);
      const group = await createTestGroup(false);
      const transcript = await createTestTranscript(group.id);
      const originalMarkdown = "Original summary text";
      await createTestSummary(transcript.transcriptId, originalMarkdown);

      const newMarkdown = "Updated summary text";

      await updateImpl(
        me,
        transcript.transcriptId,
        AI_MINUTES_SUMMARY_KEY,
        newMarkdown,
        transaction,
      );

      const updatedSummary = await db.Summary.findOne({
        where: {
          transcriptId: transcript.transcriptId,
          key: AI_MINUTES_SUMMARY_KEY,
        },
        transaction,
      });
      expect(updatedSummary?.markdown).to.equal(newMarkdown);
    });
  });
});
