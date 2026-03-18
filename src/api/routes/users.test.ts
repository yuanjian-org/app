import { expect } from "chai";
import { redactEmail, updateWechatUnionId } from "./users";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction, QueryTypes } from "sequelize";

describe("redactEmail", () => {
  it("should redact normal email", () => {
    expect(redactEmail("foo.BAR+123@Gmail.Yahoo98_")).equals(
      "fo***@Gmail.Yahoo98_",
    );
  });

  it("should handle short names (1 character)", () => {
    expect(redactEmail("a@gmail.com")).equals("a***@gmail.com");
  });

  it("should handle short names (2 characters)", () => {
    expect(redactEmail("ab@gmail.com")).equals("ab***@gmail.com");
  });

  it("should handle missing domain", () => {
    expect(redactEmail("invalid-email")).equals("invalid-email");
  });

  it("should handle missing name", () => {
    expect(redactEmail("@gmail.com")).equals("***@gmail.com");
  });

  it("should handle empty string", () => {
    expect(redactEmail("")).equals("");
  });
});

describe("updateWechatUnionId", () => {
  let transaction: Transaction;
  let testUser: any;
  const oldWechatUnionId = "old-union-id-123";

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create a test user with an initial wechatUnionId
    testUser = await db.User.create(
      {
        email: "test@example.com",
        name: "Test User",
        roles: ["UserManager"],
        wechatUnionId: oldWechatUnionId,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  it("should delete accounts table rows for both old and new wechatUnionIds", async () => {
    const newWechatUnionId = "new-union-id-456";

    // Insert test accounts for both old and new wechatUnionIds
    await sequelize.query(
      `INSERT INTO accounts (id, type, provider, provider_account_id, user_id) VALUES 
       ('11111111-1111-1111-1111-111111111111', 'oauth', 'wechat', :oldUnionId, :userId),
       ('22222222-2222-2222-2222-222222222222', 'oauth', 'wechat', :oldUnionId, :userId),
       ('33333333-3333-3333-3333-333333333333', 'oauth', 'wechat', :newUnionId, :userId)`,
      {
        replacements: {
          oldUnionId: oldWechatUnionId,
          newUnionId: newWechatUnionId,
          userId: testUser.id,
        },
        transaction,
      },
    );

    // Verify accounts exist before the update
    const accountsBefore = await sequelize.query(
      `SELECT provider_account_id FROM accounts WHERE user_id = :userId ORDER BY provider_account_id`,
      {
        replacements: { userId: testUser.id },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
    expect(accountsBefore).to.have.length(3);
    expect(accountsBefore.map((a: any) => a.provider_account_id)).to.deep.equal(
      [newWechatUnionId, oldWechatUnionId, oldWechatUnionId],
    );

    await updateWechatUnionId(
      ["UserManager"],
      testUser.id,
      newWechatUnionId,
      transaction,
    );

    // Verify all accounts with both old and new wechatUnionIds are deleted
    const accountsAfter = await sequelize.query(
      `SELECT provider_account_id FROM accounts WHERE user_id = :userId`,
      {
        replacements: { userId: testUser.id },
        transaction,
        type: QueryTypes.SELECT,
      },
    );
    expect(accountsAfter).to.have.length(0);

    // Verify user's wechatUnionId was updated
    const updatedUser = await db.User.findByPk(testUser.id, { transaction });
    expect(updatedUser?.wechatUnionId).to.equal(newWechatUnionId);
  });

  it("should set wechatUnionId to null if null is provided", async () => {
    await updateWechatUnionId(["UserManager"], testUser.id, null, transaction);

    const updatedUser = await db.User.findByPk(testUser.id, { transaction });
    void expect(updatedUser?.wechatUnionId).to.be.null;
  });

  it("should do nothing if undefined is provided", async () => {
    await updateWechatUnionId(
      ["UserManager"],
      testUser.id,
      undefined,
      transaction,
    );

    const updatedUser = await db.User.findByPk(testUser.id, { transaction });
    expect(updatedUser?.wechatUnionId).to.equal(oldWechatUnionId);
  });
});
