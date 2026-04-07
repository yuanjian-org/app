import db from "./database/db";
import sequelize from "./database/sequelize";
import { checkAndDeleteIdToken } from "./checkAndDeleteIdToken";
import { Transaction } from "sequelize";
import { expect } from "chai";
import moment from "moment";
import { tokenMaxAgeInMins } from "../shared/token";

describe("checkAndDeleteIdToken", () => {
  let transaction: Transaction;
  const testPhone = "+8613800138000";
  const testToken = "123456";

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should succeed and delete token with correct token", async () => {
    await db.IdToken.create(
      { ip: "127.0.0.1", phone: testPhone, token: testToken, failedAttempts: 0 },
      { transaction },
    );

    await checkAndDeleteIdToken("phone", testPhone, testToken, transaction);

    const token = await db.IdToken.findOne({
      where: { phone: testPhone },
      transaction,
    });
    expect(token).to.equal(null);
  });

  it("should increment failedAttempts and throw error with incorrect token", async () => {
    await db.IdToken.create(
      { ip: "127.0.0.1", phone: testPhone, token: testToken, failedAttempts: 0 },
      { transaction },
    );

    try {
      await checkAndDeleteIdToken("phone", testPhone, "wrong", transaction);
      throw new Error("EXPECTED_TO_THROW");
    } catch (e: any) {
      if (e.message === "EXPECTED_TO_THROW") {
         throw new Error("Function did not throw as expected");
      }
      expect(e.message).to.contain("验证码错误");
    }

    const token = await db.IdToken.findOne({
      where: { phone: testPhone },
      transaction,
    });
    expect(token).to.not.equal(null);
    expect(token!.failedAttempts).to.equal(1);
  });

  it("should delete token after 5 failed attempts", async () => {
    await db.IdToken.create(
      { ip: "127.0.0.1", phone: testPhone, token: testToken, failedAttempts: 4 },
      { transaction },
    );

    try {
      await checkAndDeleteIdToken("phone", testPhone, "wrong", transaction);
      throw new Error("EXPECTED_TO_THROW");
    } catch (e: any) {
      if (e.message === "EXPECTED_TO_THROW") {
         throw new Error("Function did not throw as expected");
      }
      expect(e.message).to.contain("验证码错误");
    }

    const token = await db.IdToken.findOne({
      where: { phone: testPhone },
      transaction,
    });
    expect(token).to.equal(null);
  });

  it("should delete token and throw error if expired", async () => {
    const expiredTime = moment().subtract(tokenMaxAgeInMins + 10, "minutes").toDate();
    const tokenRecord = await db.IdToken.create(
      { ip: "127.0.0.1", phone: testPhone, token: testToken, failedAttempts: 0 },
      { transaction },
    );

    // Manually update createdAt because Sequelize handles it automatically
    // Use raw query to bypass hooks and automatic timestamps.
    await sequelize.query(
        `UPDATE "IdTokens" SET "createdAt" = :expiredTime WHERE id = :id`,
        {
            replacements: { expiredTime, id: tokenRecord.id },
            transaction,
        }
    );

    try {
      await checkAndDeleteIdToken("phone", testPhone, testToken, transaction);
      throw new Error("EXPECTED_TO_THROW");
    } catch (e: any) {
      if (e.message === "EXPECTED_TO_THROW") {
         throw new Error("Function did not throw as expected");
      }
      expect(e.message).to.contain("验证码已过期");
    }

    const token = await db.IdToken.findOne({
      where: { phone: testPhone },
      transaction,
    });
    expect(token).to.equal(null);
  });
});
