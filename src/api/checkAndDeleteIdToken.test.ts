import { expect } from "chai";
import db from "./database/db";
import sequelize from "./database/sequelize";
import { Transaction } from "sequelize";
import { checkAndDeleteIdToken } from "./checkAndDeleteIdToken";
import { IdType } from "../shared/IdType";
import moment from "moment";
import { tokenMaxAgeInMins } from "../shared/token";

describe("checkAndDeleteIdToken", () => {
  let transaction: Transaction;
  const testPhone = "+8613800138000";
  const testEmail = "test@example.com";
  const testToken = "123456";

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createTestIdToken(
    idType: IdType,
    id: string,
    token: string,
    updatedAt?: Date,
  ) {
    const tokenData = idType === "phone" ? { phone: id } : { email: id };
    const t = await db.IdToken.create(
      {
        ...tokenData,
        token,
        ip: "127.0.0.1",
      },
      { transaction },
    );

    // Update the record explicitly if we need an older timestamp
    if (updatedAt) {
      await db.IdToken.update(
        { updatedAt },
        { where: { id: t.id }, transaction },
      );
    }
    return t;
  }

  it("should successfully validate and delete token for phone", async () => {
    await createTestIdToken("phone", testPhone, testToken);

    await checkAndDeleteIdToken("phone", testPhone, testToken, transaction);

    const token = await db.IdToken.findOne({
      where: { phone: testPhone },
      transaction,
    });
    void expect(token).to.equal(null);
  });

  it("should successfully validate and delete token for email", async () => {
    await createTestIdToken("email", testEmail, testToken);

    await checkAndDeleteIdToken("email", testEmail, testToken, transaction);

    const token = await db.IdToken.findOne({
      where: { email: testEmail },
      transaction,
    });
    void expect(token).to.equal(null);
  });

  it("should throw error if token is not found", async () => {
    try {
      await checkAndDeleteIdToken("phone", testPhone, testToken, transaction);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("手机验证码错误");
    }
  });

  it("should increment failedAttempts on incorrect token", async () => {
    await createTestIdToken("phone", testPhone, "correct-token");

    try {
      await checkAndDeleteIdToken(
        "phone",
        testPhone,
        "wrong-token",
        transaction,
      );
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("手机验证码错误");
    }

    const tokenRecord = await db.IdToken.findOne({
      where: { phone: testPhone },
      transaction,
    });
    void expect(tokenRecord).to.not.equal(null);
    void expect(tokenRecord!.failedAttempts).to.equal(1);
  });

  it("should destroy token after 5 failed attempts", async () => {
    await createTestIdToken("phone", testPhone, "correct-token");

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      try {
        await checkAndDeleteIdToken(
          "phone",
          testPhone,
          "wrong-token",
          transaction,
        );
      } catch (error: any) {
        void expect(error.message).to.equal("手机验证码错误。");
      }
    }

    // 5th failed attempt
    try {
      await checkAndDeleteIdToken(
        "phone",
        testPhone,
        "wrong-token",
        transaction,
      );
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("手机验证码错误次数过多");
    }

    const tokenRecord = await db.IdToken.findOne({
      where: { phone: testPhone },
      transaction,
    });
    void expect(tokenRecord).to.equal(null);
  });

  it("should throw error if token is expired", async () => {
    const expiredTime = moment()
      .subtract(tokenMaxAgeInMins + 1, "minutes")
      .toDate();
    const token = await createTestIdToken("phone", testPhone, testToken);

    // Explicitly update createdAt so Sequelize handles the database
    // update properly bypassing hooks.
    await sequelize.query(
      `UPDATE "IdTokens" SET "createdAt" = :createdAt WHERE id = :id`,
      {
        replacements: { createdAt: expiredTime, id: token.id },
        transaction,
      },
    );

    try {
      await checkAndDeleteIdToken("phone", testPhone, testToken, transaction);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("验证码已过期");
    }
  });
});
