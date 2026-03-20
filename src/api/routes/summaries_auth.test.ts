import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { updateImpl, AI_MINUTES_SUMMARY_KEY } from "./summaries";
import User from "../../shared/User";

describe("summaries update permission", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
    }
  });

  it("should throw noPermissionError when user is not in the group", async () => {
    // Create group owner
    const owner = await db.User.create(
      {
        email: `owner-${Date.now()}@test.com`,
        name: "Owner",
        roles: [],
      },
      { transaction },
    );

    // Create unauthorized user
    const unauthorized = await db.User.create(
      {
        email: `unauthorized-${Date.now()}@test.com`,
        name: "Unauthorized",
        roles: [],
      },
      { transaction },
    );

    // Create group
    const group = await db.Group.create(
      {
        name: "Secret Group",
        public: false,
      },
      { transaction },
    );

    // Add owner to group
    await db.GroupUser.create(
      {
        userId: owner.id,
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
    await db.Summary.create(
      {
        transcriptId,
        key: AI_MINUTES_SUMMARY_KEY,
        markdown: "Original",
        initialLength: 8,
        deletedLength: 0,
      },
      { transaction },
    );

    const me: User = {
      id: unauthorized.id,
      name: unauthorized.name,
      url: null,
      roles: unauthorized.roles,
      email: unauthorized.email,
      phone: unauthorized.phone,
      wechat: unauthorized.wechat,
      menteeStatus: unauthorized.menteeStatus,
      pointOfContact: null,
      pointOfContactNote: null,
    };

    let errorThrown = false;
    try {
      await updateImpl(
        me,
        transcriptId,
        AI_MINUTES_SUMMARY_KEY,
        "Updated",
        transaction,
      );
    } catch (error: any) {
      errorThrown = true;
      expect(error.code).to.equal("FORBIDDEN");
    }

    if (!errorThrown) {
      throw new Error("Error was not thrown");
    }
  });
});
