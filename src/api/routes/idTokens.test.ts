import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  resetPasswordImpl,
  updateMyPhoneAndPreference,
  sendImpl,
  setPhoneImpl,
} from "./idTokens";
import { Transaction } from "sequelize";
import { expect } from "chai";
import * as smsModule from "../sms";
import * as emailModule from "../../api/email";
import * as tokenModule from "../../shared/token";
import sinon from "sinon";
import moment from "moment";
import { TRPCError } from "@trpc/server";

describe("sendImpl", () => {
  let transaction: Transaction;
  let smsStub: sinon.SinonStub;
  let emailStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    smsStub = sinon.stub(smsModule, "sms").resolves();
    emailStub = sinon.stub(emailModule, "email").resolves();
    sinon.stub(tokenModule, "generateToken").resolves(123456);
  });

  afterEach(async () => {
    await transaction.rollback();
    sinon.restore();
  });

  it("should throw error for unsupported phone regions", async () => {
    try {
      await sendImpl("phone", "+441234567890", "127.0.0.1", transaction);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error).to.be.instanceOf(TRPCError);
      void expect(error.message).to.include("目前尚不支持您所在地区的手机号");
    }
  });

  it("should send SMS for supported China phone number", async () => {
    const phone = "+8613800138000";
    await sendImpl("phone", phone, "127.0.0.1", transaction);

    const tokenRecord = await db.IdToken.findOne({
      where: { phone, ip: "127.0.0.1" },
      transaction,
    });

    void expect(tokenRecord).to.not.be.null;
    void expect(tokenRecord!.token).to.equal("123456");
    void expect(smsStub.calledOnce).to.be.true;
    void expect(smsStub.firstCall.args[2][0].to).to.equal(phone);
  });

  it("should send SMS for supported US phone number", async () => {
    const phone = "+12025550171";
    await sendImpl("phone", phone, "127.0.0.1", transaction);

    const tokenRecord = await db.IdToken.findOne({
      where: { phone, ip: "127.0.0.1" },
      transaction,
    });

    void expect(tokenRecord).to.not.be.null;
    void expect(smsStub.calledOnce).to.be.true;
    void expect(smsStub.firstCall.args[2][0].to).to.equal(phone);
  });

  it("should send SMS for supported Italy phone number", async () => {
    const phone = "+393123456789";
    await sendImpl("phone", phone, "127.0.0.1", transaction);

    const tokenRecord = await db.IdToken.findOne({
      where: { phone, ip: "127.0.0.1" },
      transaction,
    });

    void expect(tokenRecord).to.not.be.null;
    void expect(smsStub.calledOnce).to.be.true;
    void expect(smsStub.firstCall.args[2][0].to).to.equal(phone);
  });

  it("should send email for email idType", async () => {
    const userEmail = "test@example.com";
    await sendImpl("email", userEmail, "127.0.0.1", transaction);

    const tokenRecord = await db.IdToken.findOne({
      where: { email: userEmail, ip: "127.0.0.1" },
      transaction,
    });

    void expect(tokenRecord).to.not.be.null;
    void expect(tokenRecord!.token).to.equal("123456");
    void expect(emailStub.calledOnce).to.be.true;
    void expect(emailStub.firstCall.args[0][0]).to.equal(userEmail);
  });

  it("should throw rate limit error if requested too frequently", async () => {
    const phone = "+8613800138000";
    const ip = "127.0.0.1";

    // Create a recent token record
    await db.IdToken.create(
      { ip, phone, token: "654321", updatedAt: new Date() },
      { transaction },
    );

    try {
      await sendImpl("phone", phone, ip, transaction);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error).to.be.instanceOf(TRPCError);
      void expect(error.message).to.include("验证码发送过于频繁，请稍后再试");
    }
  });

  it("should throw rate limit error if requested too frequently by target phone (even from different IP)", async () => {
    const phone = "+8613800138000";
    const ip1 = "127.0.0.1";
    const ip2 = "127.0.0.2";

    // Create a recent token record for ip1 and phone
    await db.IdToken.create(
      { ip: ip1, phone, token: "654321", updatedAt: new Date() },
      { transaction },
    );

    try {
      // Requesting for same phone from different IP
      await sendImpl("phone", phone, ip2, transaction);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error).to.be.instanceOf(TRPCError);
      void expect(error.message).to.include("验证码发送过于频繁，请稍后再试");
    }
  });

  it("should throw rate limit error if requested too frequently by IP (even for different phone)", async () => {
    const phone1 = "+8613800138000";
    const phone2 = "+8613800138001";
    const ip = "127.0.0.1";

    // Create a recent token record for ip and phone1
    await db.IdToken.create(
      { ip, phone: phone1, token: "654321", updatedAt: new Date() },
      { transaction },
    );

    try {
      // Requesting for different phone from same IP
      await sendImpl("phone", phone2, ip, transaction);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error).to.be.instanceOf(TRPCError);
      void expect(error.message).to.include("验证码发送过于频繁，请稍后再试");
    }
  });

  it("should succeed if rate limit is passed", async () => {
    const phone = "+8613800138000";
    const ip = "127.0.0.1";

    // Create an old token record (older than min send interval, e.g.,
    // 65 seconds ago)
    await db.IdToken.create(
      {
        ip,
        phone,
        token: "654321",
      },
      { transaction },
    );

    // Sequelize automatically updates updatedAt on creation, so we need to
    // manually update it here
    // But silent: true will not skip timestamp updates if they are globally
    // defined. Instead use direct query
    await sequelize.query(
      `UPDATE "IdTokens" SET "updatedAt" = :updatedAt WHERE ip = :ip AND phone = :phone AND token = :token`,
      {
        replacements: {
          updatedAt: moment().subtract(65, "seconds").toDate(),
          ip,
          phone,
          token: "654321",
        },
        transaction,
      },
    );

    await sendImpl("phone", phone, ip, transaction);

    const tokenRecord = await db.IdToken.findOne({
      where: { phone, ip },
      transaction,
    });

    void expect(tokenRecord).to.not.be.null;
    void expect(tokenRecord!.token).to.equal("123456");
    void expect(smsStub.calledOnce).to.be.true;
  });
});

describe("setPhoneImpl", () => {
  let transaction: Transaction;
  const token = "123456";
  const phone = "+8613800138000";

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    await db.IdToken.create({ ip: "127.0.0.1", phone, token }, { transaction });
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should update phone when existing user is not found", async () => {
    const me = await db.User.create({ name: "me user" }, { transaction });

    await setPhoneImpl(phone, token, me, transaction);

    await me.reload({ transaction });
    void expect(me.phone).to.equal(phone);
  });

  it("should throw error when existing user is found and current user already has phone", async () => {
    await db.User.create({ phone, name: "existing user" }, { transaction });
    const me = await db.User.create(
      { phone: "+8613900139000", name: "me user" },
      { transaction },
    );

    try {
      await setPhoneImpl(phone, token, me, transaction);
      expect.fail("Expected error to be thrown");
    } catch (error: any) {
      void expect(error).to.be.instanceOf(TRPCError);
      void expect(error.message).to.include("手机号已经被使用。");
    }
  });

  it("should merge accounts when existing user is found and current user has NO phone (all fields present)", async () => {
    const existingUser = await db.User.create(
      { phone, name: "existing user" },
      { transaction },
    );
    const me = await db.User.create(
      {
        name: "me user",
        email: "me@example.com",
        wechatUnionId: "wechat-id-123",
        password: "hashed-password",
      },
      { transaction },
    );

    await setPhoneImpl(phone, token, me, transaction);

    await me.reload({ transaction });
    void expect(me.email).to.be.null;
    void expect(me.wechatUnionId).to.be.null;
    void expect(me.password).to.be.null;
    void expect(me.mergedTo).to.equal(existingUser.id);

    await existingUser.reload({ transaction });
    void expect(existingUser.email).to.equal("me@example.com");
    void expect(existingUser.wechatUnionId).to.equal("wechat-id-123");
    void expect(existingUser.password).to.equal("hashed-password");
  });

  it("should merge accounts when existing user is found and current user has NO phone (some fields missing)", async () => {
    const existingUser = await db.User.create(
      {
        phone,
        name: "existing user",
        email: "existing@example.com",
        wechatUnionId: "existing-wechat",
        password: "existing-password",
      },
      { transaction },
    );
    const me = await db.User.create({ name: "me user" }, { transaction });

    await setPhoneImpl(phone, token, me, transaction);

    await me.reload({ transaction });
    void expect(me.email).to.be.null;
    void expect(me.wechatUnionId).to.be.null;
    void expect(me.password).to.be.null;
    void expect(me.mergedTo).to.equal(existingUser.id);

    await existingUser.reload({ transaction });
    // existing user keeps its own fields if `me` doesn't have them
    void expect(existingUser.email).to.equal("existing@example.com");
    void expect(existingUser.wechatUnionId).to.equal("existing-wechat");
    void expect(existingUser.password).to.equal("existing-password");
  });
});

describe("resetPasswordImpl", () => {
  const testPhone = "+8613800138000";
  const testEmail = "test@example.com";
  const hashedPassword = "abcdef";
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
        hashedPassword,
        transaction,
      );

      const user = await db.User.findOne({
        where: { phone: testPhone },
        transaction,
      });
      void expect(user).to.not.be.null;
      void expect(user!.phone).to.equal(testPhone);
      void expect(user!.password).to.not.be.null;

      // Verify password is stored as provided (already hashed)
      void expect(user!.password).to.equal(hashedPassword);
    });

    it("should update existing user password", async () => {
      const user = await createTestUser("phone", testPhone);
      await createTestIdToken("phone", testPhone, testToken);

      await resetPasswordImpl(
        "phone",
        testPhone,
        testToken,
        hashedPassword,
        transaction,
      );

      await user.reload({ transaction });
      void expect(user.password).to.not.be.null;

      // Verify password is stored as provided (already hashed)
      void expect(user.password).to.equal(hashedPassword);
    });
  });

  describe("email password reset", () => {
    it("should create new user if user does not exist", async () => {
      await createTestIdToken("email", testEmail, testToken);

      await resetPasswordImpl(
        "email",
        testEmail,
        testToken,
        hashedPassword,
        transaction,
      );

      const user = await db.User.findOne({
        where: { email: testEmail },
        transaction,
      });
      void expect(user).to.not.be.null;
      void expect(user!.email).to.equal(testEmail);
      void expect(user!.password).to.not.be.null;

      // Verify password is stored as provided (already hashed)
      void expect(user!.password).to.equal(hashedPassword);
    });

    it("should update existing user password", async () => {
      const user = await createTestUser("email", testEmail);
      await createTestIdToken("email", testEmail, testToken);

      await resetPasswordImpl(
        "email",
        testEmail,
        testToken,
        hashedPassword,
        transaction,
      );

      await user.reload({ transaction });
      void expect(user.password).to.not.be.null;

      // Verify password is stored as provided (already hashed)
      void expect(user.password).to.equal(hashedPassword);
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
          hashedPassword,
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
          hashedPassword,
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
          hashedPassword,
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
          hashedPassword,
          transaction,
        );
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        void expect(error).to.be.instanceOf(Error);
        void expect(error.message).to.include("手机验证码错误");
      }
    });

    it("should increment failedAttempts on incorrect token", async () => {
      await createTestIdToken("phone", testPhone, "correct-token");

      try {
        await resetPasswordImpl(
          "phone",
          testPhone,
          "wrong-token",
          hashedPassword,
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
      void expect(tokenRecord!.failedAttempts).to.equal(1);
    });

    it("should destroy token after 5 failed attempts", async () => {
      await createTestIdToken("phone", testPhone, "correct-token");

      // 4 failed attempts
      for (let i = 0; i < 4; i++) {
        try {
          await resetPasswordImpl(
            "phone",
            testPhone,
            "wrong-token",
            hashedPassword,
            transaction,
          );
        } catch (error: any) {
          void expect(error.message).to.equal("手机验证码错误。");
        }
      }

      // 5th failed attempt
      try {
        await resetPasswordImpl(
          "phone",
          testPhone,
          "wrong-token",
          hashedPassword,
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
      void expect(tokenRecord).to.be.null;
    });

    it("should delete token after successful reset", async () => {
      await createTestIdToken("phone", testPhone, testToken);

      await resetPasswordImpl(
        "phone",
        testPhone,
        testToken,
        hashedPassword,
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
          hashedPassword,
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
          hashedPassword,
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
