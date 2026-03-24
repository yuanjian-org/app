import { expect } from "chai";
import { setUserStateImpl } from "./users";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";

describe("setUserState security", () => {
  let transaction: Transaction;
  let regularUser: any;
  let managerUser: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    regularUser = await db.User.create(
      {
        email: `user-${Date.now()}-${Math.random()}@example.com`,
        name: "普通用户",
        roles: ["Volunteer"],
      },
      { transaction },
    );

    managerUser = await db.User.create(
      {
        email: `manager-${Date.now()}-${Math.random()}@example.com`,
        name: "管理员",
        roles: ["UserManager"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("regular user cannot update their own exam dates", async () => {
    const examDate = new Date("2025-01-01T00:00:00Z");

    await setUserStateImpl(
      regularUser,
      {
        menteeInterviewerExam: examDate,
        handbookExam: examDate,
        commsExam: examDate,
        lastKudosReadAt: examDate,
      },
      transaction,
    );

    const updatedUser = await db.User.findByPk(regularUser.id, { transaction });
    const state = updatedUser?.state || {};

    // Sensitive fields should NOT be updated
    void expect(state.menteeInterviewerExam).to.be.undefined;
    void expect(state.handbookExam).to.be.undefined;
    void expect(state.commsExam).to.be.undefined;

    // Non-sensitive fields should still be updated
    expect(new Date(state.lastKudosReadAt!)).to.deep.equal(examDate);
  });

  it("UserManager can still update their own exam dates (via setUserState path)", async () => {
    const examDate = new Date("2025-01-01T00:00:00Z");

    await setUserStateImpl(
      managerUser,
      {
        menteeInterviewerExam: examDate,
        handbookExam: examDate,
        commsExam: examDate,
      },
      transaction,
    );

    const updatedUser = await db.User.findByPk(managerUser.id, { transaction });
    const state = updatedUser?.state || {};

    expect(new Date(state.menteeInterviewerExam!)).to.deep.equal(examDate);
    expect(new Date(state.handbookExam!)).to.deep.equal(examDate);
    expect(new Date(state.commsExam!)).to.deep.equal(examDate);
  });
});
