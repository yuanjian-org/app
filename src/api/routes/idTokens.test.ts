import db from "../database/db";
import sequelize from "../database/sequelize";
import { resetPasswordImpl } from "./idTokens";
import { Op } from "sequelize";
import { compare } from "bcryptjs";
import { expect } from "chai";

describe("resetPasswordImpl", () => {
  const testPhone = "+8613800138000";
  const testEmail = "test@example.com";
  const validPassword = "validpassword123";
  const testToken = "test-token-123";

  // Helper function to create a test user
  async function createTestUser(
    idType: string,
    id: string,
    roles: string[] = [],
  ) {
    const userData = idType === "phone" ? { phone: id } : { email: id };
    return await db.User.create({
      ...userData,
      name: "Test User",
      roles,
    });
  }

  // Helper function to create a test ID token
  async function createTestIdToken(idType: string, id: string, token: string) {
    const tokenData = idType === "phone" ? { phone: id } : { email: id };
    return await db.IdToken.create({
      ...tokenData,
      token,
      ip: "127.0.0.1",
    });
  }

  // Helper function to clean up test data
  async function cleanupTestData() {
    await sequelize.transaction(async (transaction: any) => {
      await db.User.destroy({
        where: {
          [Op.or]: [{ phone: testPhone }, { email: testEmail }],
        },
        transaction,
      });
      await db.IdToken.destroy({
        where: {
          [Op.or]: [{ phone: testPhone }, { email: testEmail }],
        },
        transaction,
      });
    });
  }

  beforeEach(async () => {
    await cleanupTestData();
  });

  after(async () => {
    await cleanupTestData();
  });

  describe("phone number password reset", () => {
    it("should create new user if user does not exist", async () => {
      await createTestIdToken("phone", testPhone, testToken);

      await resetPasswordImpl("phone", testPhone, testToken, validPassword);

      const user = await db.User.findOne({ where: { phone: testPhone } });
      void expect(user).to.not.be.null;
      void expect(user!.phone).to.equal(testPhone);
      void expect(user!.password).to.not.be.null;

      // Verify password is hashed
      const isPasswordValid = await compare(validPassword, user!.password!);
      void expect(isPasswordValid).to.be.true;
    });

    it("should update existing user password", async () => {
      const user = await createTestUser("phone", testPhone);
      await createTestIdToken("phone", testPhone, testToken);

      await resetPasswordImpl("phone", testPhone, testToken, validPassword);

      await user.reload();
      void expect(user.password).to.not.be.null;

      // Verify password is hashed
      const isPasswordValid = await compare(validPassword, user.password!);
      void expect(isPasswordValid).to.be.true;
    });
  });

  describe("email password reset", () => {
    it("should create new user if user does not exist", async () => {
      await createTestIdToken("email", testEmail, testToken);

      await resetPasswordImpl("email", testEmail, testToken, validPassword);

      const user = await db.User.findOne({ where: { email: testEmail } });
      void expect(user).to.not.be.null;
      void expect(user!.email).to.equal(testEmail);
      void expect(user!.password).to.not.be.null;

      // Verify password is hashed
      const isPasswordValid = await compare(validPassword, user!.password!);
      void expect(isPasswordValid).to.be.true;
    });

    it("should update existing user password", async () => {
      const user = await createTestUser("email", testEmail);
      await createTestIdToken("email", testEmail, testToken);

      await resetPasswordImpl("email", testEmail, testToken, validPassword);

      await user.reload();
      void expect(user.password).to.not.be.null;

      // Verify password is hashed
      const isPasswordValid = await compare(validPassword, user.password!);
      void expect(isPasswordValid).to.be.true;
    });
  });

  describe("privileged user restrictions", () => {
    it("should throw error for UserManager role", async () => {
      await createTestUser("phone", testPhone, ["UserManager"]);
      await createTestIdToken("phone", testPhone, testToken);

      try {
        await resetPasswordImpl("phone", testPhone, testToken, validPassword);
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("特权用户禁止使用密码登录");
      }
    });

    it("should throw error for GroupManager role", async () => {
      await createTestUser("phone", testPhone, ["GroupManager"]);
      await createTestIdToken("phone", testPhone, testToken);

      try {
        await resetPasswordImpl("phone", testPhone, testToken, validPassword);
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("特权用户禁止使用密码登录");
      }
    });
  });

  describe("token validation and cleanup", () => {
    it("should throw error for invalid token", async () => {
      await createTestIdToken("phone", testPhone, "different-token");

      try {
        await resetPasswordImpl("phone", testPhone, testToken, validPassword);
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("手机验证码错误");
      }
    });

    it("should throw error for non-existent token", async () => {
      try {
        await resetPasswordImpl("phone", testPhone, testToken, validPassword);
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("手机验证码错误");
      }
    });

    it("should delete token after successful reset", async () => {
      await createTestIdToken("phone", testPhone, testToken);

      await resetPasswordImpl("phone", testPhone, testToken, validPassword);

      const token = await db.IdToken.findOne({
        where: { phone: testPhone, token: testToken },
      });
      void expect(token).to.be.null;
    });

    it("should throw error for email with invalid token", async () => {
      await createTestIdToken("email", testEmail, "different-token");

      try {
        await resetPasswordImpl("email", testEmail, testToken, validPassword);
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("邮箱验证码错误");
      }
    });
  });

  describe("transaction handling", () => {
    it("should rollback on error", async () => {
      // Create a user with privileged role to trigger error
      await createTestUser("phone", testPhone, ["UserManager"]);
      await createTestIdToken("phone", testPhone, testToken);

      try {
        await resetPasswordImpl("phone", testPhone, testToken, validPassword);
        expect.fail("Expected error to be thrown");
      } catch {
        // Expected error
      }

      // Verify token is still there (transaction rolled back)
      const token = await db.IdToken.findOne({
        where: { phone: testPhone, token: testToken },
      });
      void expect(token).to.not.be.null;
    });
  });
});
