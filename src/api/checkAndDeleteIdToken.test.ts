import { expect } from "chai";
import db from "./database/db";
import sequelize from "./database/sequelize";
import { Op } from "sequelize";
import { checkAndDeleteIdToken } from "./checkAndDeleteIdToken";
import { IdType } from "../shared/IdType";
import moment from "moment";
import { tokenMaxAgeInMins } from "../shared/token";

describe("checkAndDeleteIdToken", () => {
  const testPhone = "+8613800138000";
  const testEmail = "test@example.com";
  const testToken = "123456";

  afterEach(async () => {
    await db.IdToken.destroy({
      where: { [Op.or]: [{ phone: testPhone }, { email: testEmail }] },
    });
    await db.User.destroy({
      where: { [Op.or]: [{ phone: testPhone }, { email: testEmail }] },
    });
  });

  async function createTestIdToken(
    idType: IdType,
    id: string,
    token: string,
    updatedAt?: Date,
  ) {
    const tokenData = idType === "phone" ? { phone: id } : { email: id };
    const t = await db.IdToken.create({
      ...tokenData,
      token,
      ip: "127.0.0.1",
    });

    // Update the record explicitly if we need an older timestamp
    if (updatedAt) {
      await db.IdToken.update({ updatedAt }, { where: { id: t.id } });
    }
    return t;
  }

  it("should successfully validate and delete token for phone", async () => {
    await createTestIdToken("phone", testPhone, testToken);

    await checkAndDeleteIdToken("phone", testPhone, testToken);

    const token = await db.IdToken.findOne({
      where: { phone: testPhone },
    });
    void expect(token).to.equal(null);
  });

  it("should successfully validate and delete token for email", async () => {
    await createTestIdToken("email", testEmail, testToken);

    await checkAndDeleteIdToken("email", testEmail, testToken);

    const token = await db.IdToken.findOne({
      where: { email: testEmail },
    });
    void expect(token).to.equal(null);
  });

  it("should throw error if token is not found", async () => {
    try {
      await checkAndDeleteIdToken("phone", testPhone, testToken);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("手机验证码错误");
    }
  });

  it("should increment failedAttempts on incorrect token", async () => {
    await createTestIdToken("phone", testPhone, "correct-token");

    try {
      await checkAndDeleteIdToken("phone", testPhone, "wrong-token");
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("手机验证码错误");
    }

    const tokenRecord = await db.IdToken.findOne({
      where: { phone: testPhone },
    });
    void expect(tokenRecord).to.not.equal(null);
    void expect(tokenRecord!.failedAttempts).to.equal(1);
  });

  it("should destroy token after 5 failed attempts", async () => {
    await createTestIdToken("phone", testPhone, "correct-token");

    // 4 failed attempts
    for (let i = 0; i < 4; i++) {
      try {
        await checkAndDeleteIdToken("phone", testPhone, "wrong-token");
      } catch (error: any) {
        void expect(error.message).to.equal("手机验证码错误。");
      }
    }

    // 5th failed attempt
    try {
      await checkAndDeleteIdToken("phone", testPhone, "wrong-token");
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("手机验证码错误次数过多");
    }

    const tokenRecord = await db.IdToken.findOne({
      where: { phone: testPhone },
    });
    void expect(tokenRecord).to.equal(null);
  });

  it("should throw error and destroy token if token is expired", async () => {
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
      },
    );

    try {
      await checkAndDeleteIdToken("phone", testPhone, testToken);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error.message).to.include("验证码已过期");
    }

    const tokenRecord = await db.IdToken.findOne({
      where: { phone: testPhone },
    });
    void expect(tokenRecord).to.equal(null);
  });

  describe("nested transactions", () => {
    it("should commit both inner and outer transactions when validation and outer operations succeed", async () => {
      await createTestIdToken("phone", testPhone, testToken);

      await sequelize.transaction(async (outerTransaction) => {
        await checkAndDeleteIdToken("phone", testPhone, testToken);
        await db.User.create(
          { phone: testPhone, name: "Nested Success User" },
          { transaction: outerTransaction },
        );
      });

      const tokenRecord = await db.IdToken.findOne({
        where: { phone: testPhone },
      });
      void expect(tokenRecord).to.equal(null);

      const userRecord = await db.User.findOne({
        where: { phone: testPhone },
      });
      void expect(userRecord).to.not.equal(null);
      void expect(userRecord!.name).to.equal("Nested Success User");
    });

    it("should commit inner transaction (failedAttempts and 5-attempt deletion) while rolling back outer transaction on invalid token", async () => {
      await createTestIdToken("phone", testPhone, "correct-token");

      for (let i = 1; i <= 4; i++) {
        try {
          await sequelize.transaction(async (outerTransaction) => {
            await db.User.create(
              { phone: testPhone, name: "Should Rollback" },
              { transaction: outerTransaction },
            );
            await checkAndDeleteIdToken("phone", testPhone, "wrong-token");
          });
          expect.fail("Expected error to be thrown");
        } catch (error: any) {
          void expect(error.message).to.equal("手机验证码错误。");
        }

        const tokenRecord = await db.IdToken.findOne({
          where: { phone: testPhone },
        });
        void expect(tokenRecord).to.not.equal(null);
        void expect(tokenRecord!.failedAttempts).to.equal(i);

        const userRecord = await db.User.findOne({
          where: { phone: testPhone },
        });
        void expect(userRecord).to.equal(null);
      }

      try {
        await sequelize.transaction(async (outerTransaction) => {
          await db.User.create(
            { phone: testPhone, name: "Should Rollback" },
            { transaction: outerTransaction },
          );
          await checkAndDeleteIdToken("phone", testPhone, "wrong-token");
        });
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error.message).to.include("手机验证码错误次数过多");
      }

      const deletedToken = await db.IdToken.findOne({
        where: { phone: testPhone },
      });
      void expect(deletedToken).to.equal(null);

      const userRecord = await db.User.findOne({
        where: { phone: testPhone },
      });
      void expect(userRecord).to.equal(null);
    });

    it("should commit inner transaction (expired token deletion) while rolling back outer transaction on expired token", async () => {
      const expiredTime = moment()
        .subtract(tokenMaxAgeInMins + 1, "minutes")
        .toDate();
      const token = await createTestIdToken("phone", testPhone, testToken);

      await sequelize.query(
        `UPDATE "IdTokens" SET "createdAt" = :createdAt WHERE id = :id`,
        {
          replacements: { createdAt: expiredTime, id: token.id },
        },
      );

      try {
        await sequelize.transaction(async (outerTransaction) => {
          await db.User.create(
            { phone: testPhone, name: "Should Rollback" },
            { transaction: outerTransaction },
          );
          await checkAndDeleteIdToken("phone", testPhone, testToken);
        });
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error.message).to.include("验证码已过期");
      }

      const tokenRecord = await db.IdToken.findOne({
        where: { phone: testPhone },
      });
      void expect(tokenRecord).to.equal(null);

      const userRecord = await db.User.findOne({
        where: { phone: testPhone },
      });
      void expect(userRecord).to.equal(null);
    });

    it("should keep inner transaction committed while rolling back outer transaction when outer transaction throws after token validation", async () => {
      await createTestIdToken("phone", testPhone, testToken);

      try {
        await sequelize.transaction(async (outerTransaction) => {
          await checkAndDeleteIdToken("phone", testPhone, testToken);
          await db.User.create(
            { phone: testPhone, name: "Should Rollback" },
            { transaction: outerTransaction },
          );
          throw new Error("Downstream error in outer transaction");
        });
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error.message).to.equal(
          "Downstream error in outer transaction",
        );
      }

      const tokenRecord = await db.IdToken.findOne({
        where: { phone: testPhone },
      });
      void expect(tokenRecord).to.equal(null);

      const userRecord = await db.User.findOne({
        where: { phone: testPhone },
      });
      void expect(userRecord).to.equal(null);
    });
  });
});
