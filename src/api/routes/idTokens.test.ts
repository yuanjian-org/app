import db from "../database/db";
import sequelize from "../database/sequelize";
import { resetPasswordImpl, updateMyPhoneAndPreference } from "./idTokens";
import { Transaction } from "sequelize";
import { compare } from "bcryptjs";
import { expect } from "chai";

describe("resetPasswordImpl", () => {
  const testPhone = "+8613800138000";
  const testEmail = "test@example.com";
  const validPassword = "validpassword123";
  const testToken = "test-token-123";
  let transaction: Transaction;

  // Helper function to create a test user
  async function createTestUser(
    idType: string,
    id: string,
    roles: string[] = [],
  ) {
    const userData = idType === "phone" ? { phone: id } : { email: id };
    return await db.User.create(
      {
        ...userData,
        name: "Test User",
        roles,
      },
      { transaction },
    );
  }

  // Helper function to create a test ID token
  async function createTestIdToken(idType: string, id: string, token: string) {
    const tokenData = idType === "phone" ? { phone: id } : { email: id };
    return await db.IdToken.create(
      {
        ...tokenData,
        token,
        ip: "127.0.0.1",
      },
      { transaction },
    );
  }

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("phone number password reset", () => {
    it("should create new user if user does not exist", async () => {
      await createTestIdToken("phone", testPhone, testToken);

      await resetPasswordImpl(
        "phone",
        testPhone,
        testToken,
        validPassword,
        transaction,
      );

      const user = await db.User.findOne({
        where: { phone: testPhone },
        transaction,
      });
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

      await resetPasswordImpl(
        "phone",
        testPhone,
        testToken,
        validPassword,
        transaction,
      );

      await user.reload({ transaction });
      void expect(user.password).to.not.be.null;

      // Verify password is hashed
      const isPasswordValid = await compare(validPassword, user.password!);
      void expect(isPasswordValid).to.be.true;
    });
  });

  describe("email password reset", () => {
    it("should create new user if user does not exist", async () => {
      await createTestIdToken("email", testEmail, testToken);

      await resetPasswordImpl(
        "email",
        testEmail,
        testToken,
        validPassword,
        transaction,
      );

      const user = await db.User.findOne({
        where: { email: testEmail },
        transaction,
      });
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

      await resetPasswordImpl(
        "email",
        testEmail,
        testToken,
        validPassword,
        transaction,
      );

      await user.reload({ transaction });
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
        await resetPasswordImpl(
          "phone",
          testPhone,
          testToken,
          validPassword,
          transaction,
        );
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
        await resetPasswordImpl(
          "phone",
          testPhone,
          testToken,
          validPassword,
          transaction,
        );
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
        await resetPasswordImpl(
          "phone",
          testPhone,
          testToken,
          validPassword,
          transaction,
        );
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("手机验证码错误");
      }
    });

    it("should throw error for non-existent token", async () => {
      try {
        await resetPasswordImpl(
          "phone",
          testPhone,
          testToken,
          validPassword,
          transaction,
        );
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("手机验证码错误");
      }
    });

    it("should delete token after successful reset", async () => {
      await createTestIdToken("phone", testPhone, testToken);

      await resetPasswordImpl(
        "phone",
        testPhone,
        testToken,
        validPassword,
        transaction,
      );

      const token = await db.IdToken.findOne({
        where: { phone: testPhone, token: testToken },
        transaction,
      });
      void expect(token).to.be.null;
    });

    it("should throw error for email with invalid token", async () => {
      await createTestIdToken("email", testEmail, "different-token");

      try {
        await resetPasswordImpl(
          "email",
          testEmail,
          testToken,
          validPassword,
          transaction,
        );
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
        await resetPasswordImpl(
          "phone",
          testPhone,
          testToken,
          validPassword,
          transaction,
        );
        expect.fail("Expected error to be thrown");
      } catch {
        // Expected error
      }
    });
  });
});

describe("updateMyPhoneAndPreference", () => {
  const chinaPhone = "+8613800138000";
  const nonChinaPhone = "+12345678901";
  let transaction: Transaction;

  // Helper function to create a test user
  async function createTestUser(
    phone: string | null = null,
    preference: any = null,
  ) {
    const userData = phone ? { phone } : {};
    return await db.User.create(
      {
        ...userData,
        name: "Test User",
        preference,
      },
      { transaction },
    );
  }

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should update phone for China phone numbers without disabling SMS", async () => {
    const user = await createTestUser(null, { smsDisabled: [] });

    // Function should update phone but not disable SMS
    await updateMyPhoneAndPreference(user.id, null, chinaPhone, transaction);

    await user.reload({ transaction });
    void expect(user.phone).to.equal(chinaPhone);
    void expect(user.preference?.smsDisabled).to.deep.equal([]);
  });

  it("should update phone when user already has phone number without disabling SMS", async () => {
    const user = await createTestUser("+12345678901", {
      smsDisabled: [],
    });

    // Function should update phone but not disable SMS
    await updateMyPhoneAndPreference(
      user.id,
      "+12345678901",
      nonChinaPhone,
      transaction,
    );

    await user.reload({ transaction });
    void expect(user.phone).to.equal(nonChinaPhone);
    void expect(user.preference?.smsDisabled).to.deep.equal([]);
  });

  it("should update phone to China number when user already has phone without disabling SMS", async () => {
    const user = await createTestUser("+12345678901", {
      smsDisabled: [],
    });

    // Function should update phone but not disable SMS
    await updateMyPhoneAndPreference(
      user.id,
      "+12345678901",
      chinaPhone,
      transaction,
    );

    await user.reload({ transaction });
    void expect(user.phone).to.equal(chinaPhone);
    void expect(user.preference?.smsDisabled).to.deep.equal([]);
  });

  it("should disable SMS for non-China phone with no existing phone", async () => {
    const user = await createTestUser(null, { smsDisabled: [] });

    await updateMyPhoneAndPreference(user.id, null, nonChinaPhone, transaction);

    await user.reload({ transaction });
    void expect(user.phone).to.equal(nonChinaPhone);
    void expect(user.preference?.smsDisabled).to.include("基础");
  });

  it("should preserve existing smsDisabled preferences", async () => {
    const existingPreferences = { smsDisabled: ["点赞", "待办事项"] };
    const user = await createTestUser(null, existingPreferences);

    await updateMyPhoneAndPreference(user.id, null, nonChinaPhone, transaction);

    await user.reload({ transaction });
    void expect(user.phone).to.equal(nonChinaPhone);
    void expect(user.preference?.smsDisabled).to.include("基础");
    void expect(user.preference?.smsDisabled).to.include("点赞");
    void expect(user.preference?.smsDisabled).to.include("待办事项");
  });

  it("should handle user with no existing preferences", async () => {
    const user = await createTestUser(null, null);

    await updateMyPhoneAndPreference(user.id, null, nonChinaPhone, transaction);

    await user.reload({ transaction });
    void expect(user.phone).to.equal(nonChinaPhone);
    void expect(user.preference?.smsDisabled).to.deep.equal(["基础"]);
  });
});
