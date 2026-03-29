import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { listImpl, getSummaries } from "./transcripts";
import User from "../../shared/User";
import { v4 as uuidv4 } from "uuid";

describe("transcripts", () => {
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

  describe("listImpl", () => {
    it("should return the transcripts for a group when the user has permission", async () => {
      const me = await createTestUser(["Volunteer"]);
      const group = await createTestGroup();
      await db.GroupUser.create(
        { userId: me.id, groupId: group.id },
        { transaction },
      );
      const transcript1 = await createTestTranscript(group.id);
      const transcript2 = await createTestTranscript(group.id);

      const result = await listImpl(me, group.id, transaction);

      expect(result).to.have.lengthOf(2);
      const transcriptIds = result.map((t: any) => t.transcriptId);
      expect(transcriptIds).to.include(transcript1.transcriptId);
      expect(transcriptIds).to.include(transcript2.transcriptId);
    });

    it("should throw a notFoundError if the group does not exist", async () => {
      const me = await createTestUser();
      const nonExistentGroupId = uuidv4();
      try {
        await listImpl(me, nonExistentGroupId, transaction);
        expect.fail("Expected notFoundError to be thrown");
      } catch (e: any) {
        expect(e.message).to.include("分组");
      }
    });

    it("should throw an error if the user has no permission to access the group history", async () => {
      const me = await createTestUser(["Volunteer"]);
      const group = await createTestGroup(false);
      // User is not in the group, and it's a private group without manager roles
      await createTestTranscript(group.id);

      try {
        await listImpl(me, group.id, transaction);
        expect.fail("Expected permission error to be thrown");
      } catch (e: any) {
        expect(e.message).to.include("没有权限访问分组");
      }
    });
  });

  describe("getSummaries", () => {
    it("should return summaries for a given transcriptId", async () => {
      const group = await createTestGroup();
      const transcript = await createTestTranscript(group.id);
      const summary1 = await db.Summary.create(
        {
          transcriptId: transcript.transcriptId,
          key: "test-summary-key-1",
          markdown: "summary 1",
          initialLength: "summary 1".length,
          deletedLength: 0,
        },
        { transaction },
      );
      const summary2 = await db.Summary.create(
        {
          transcriptId: transcript.transcriptId,
          key: "test-summary-key-2",
          markdown: "summary 2",
          initialLength: "summary 2".length,
          deletedLength: 0,
        },
        { transaction },
      );

      const result = await getSummaries(transcript.transcriptId, transaction);

      expect(result).to.have.lengthOf(2);
      const summaryKeys = result.map((s: any) => s.key);
      expect(summaryKeys).to.include(summary1.key);
      expect(summaryKeys).to.include(summary2.key);
    });

    it("should return an empty array if there are no summaries for the transcript", async () => {
      const group = await createTestGroup();
      const transcript = await createTestTranscript(group.id);

      const result = await getSummaries(transcript.transcriptId, transaction);
      expect(result).to.have.lengthOf(0);
    });
  });
});
