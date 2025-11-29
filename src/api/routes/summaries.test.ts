import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { listImpl, AI_MINUTES_SUMMARY_KEY } from "./summaries";
import User from "shared/User";

describe("listImpl", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should return the AI minutes summary for a transcript", async () => {
    // Create test user
    const user = await db.User.create(
      {
        email: `test-user-${Date.now()}@test.com`,
        name: "Test User",
        roles: ["MentorshipManager"],
      },
      { transaction },
    );

    // Create test group
    const group = await db.Group.create(
      {
        name: "Test Group",
        public: true,
      },
      { transaction },
    );

    // Add user to group
    await db.GroupUser.create(
      {
        userId: user.id,
        groupId: group.id,
      },
      { transaction },
    );

    // Create transcript
    const transcriptId = `test-transcript-${Date.now()}`;
    await db.Transcript.create(
      {
        transcriptId,
        groupId: group.id,
        startedAt: new Date(),
        endedAt: new Date(),
      },
      { transaction },
    );

    // Create summary
    const summaryMarkdown = "This is a test summary";
    await db.Summary.create(
      {
        transcriptId,
        key: AI_MINUTES_SUMMARY_KEY,
        markdown: summaryMarkdown,
        initialLength: summaryMarkdown.length,
        deletedLength: 0,
      },
      { transaction },
    );

    // Convert db user to User type
    const me: User = {
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
    };

    // Call listImpl
    const result = await listImpl(me, transcriptId, transaction);

    // Verify results
    expect(result).to.have.lengthOf(1);
    expect(result[0].transcriptId).to.equal(transcriptId);
    expect(result[0].key).to.equal(AI_MINUTES_SUMMARY_KEY);
    expect(result[0].markdown).to.equal(summaryMarkdown);
  });
});
