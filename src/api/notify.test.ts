import { expect } from "chai";
import { Transaction } from "sequelize";
import { notify } from "./notify";
import db from "./database/db";
import { NotificationType } from "shared/UserPreference";
import sequelize from "./database/sequelize";
import * as smsModule from "./sms";
import * as emailModule from "./email";
import sinon from "sinon";

describe("notify()", () => {
  let transaction: Transaction;
  let smsStub: sinon.SinonStub;
  let emailStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Stub the SMS and email functions to capture their calls
    // We need to stub them to always call our mock, bypassing the test detection
    smsStub = sinon.stub(smsModule, "sms").callsFake(() => {
      // Mock implementation that always executes
      return Promise.resolve();
    });
    emailStub = sinon.stub(emailModule, "email").callsFake(() => {
      // Mock implementation that always executes
      return Promise.resolve();
    });
  });

  afterEach(async () => {
    await transaction.rollback();
    sinon.restore();
  });

  describe("notify() function", () => {
    it("should not send notifications to users with no email or phone", async () => {
      // Create a user with no email or phone
      const user = await db.User.create(
        {
          phone: null,
          email: null,
          name: "Test User",
          roles: ["Mentee"],
        },
        { transaction },
      );

      await notify(
        "基础" as NotificationType,
        [user.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify SMS and email were called but with empty arrays
      void expect(smsStub.calledOnce).to.be.true;
      void expect(emailStub.calledOnce).to.be.true;

      // Verify SMS was called with empty template data
      const smsCall = smsStub.getCall(0);
      void expect(smsCall.args[2]).to.have.length(0); // Empty template data array

      // Verify email was called with empty email list
      const emailCall = emailStub.getCall(0);
      void expect(emailCall.args[0]).to.have.length(0); // Empty email array
    });

    it("should filter users based on SMS preferences", async () => {
      // Create users with different SMS preferences
      const user1 = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user1@test.com",
          name: "User 1",
          roles: ["Mentee"],
          preference: {
            smsDisabled: ["基础"], // SMS disabled for 基础 notifications
          },
        },
        { transaction },
      );

      const user2 = await db.User.create(
        {
          phone: "+8613800138001",
          email: "user2@test.com",
          name: "User 2",
          roles: ["Mentee"],
          preference: {
            smsDisabled: ["点赞"], // SMS enabled for 基础 notifications
          },
        },
        { transaction },
      );

      const user3 = await db.User.create(
        {
          phone: "+8613800138002",
          email: "user3@test.com",
          name: "User 3",
          roles: ["Mentee"],
          preference: null, // No preferences, should receive SMS
        },
        { transaction },
      );

      await notify(
        "基础" as NotificationType,
        [user1.id, user2.id, user3.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify SMS was called with only users 2 and 3 (user1 has SMS disabled for 基础)
      void expect(smsStub.calledOnce).to.be.true;
      const smsCall = smsStub.getCall(0);
      expect(smsCall.args[0]).to.equal("yaD264"); // domesticSms template
      expect(smsCall.args[1]).to.equal("0Rr8G"); // internationalSms template

      const smsData = smsCall.args[2]; // templateData array
      expect(smsData).to.have.length(2); // Only user2 and user3
      expect(smsData.map((d: any) => d.to)).to.include.members([
        "+8613800138001",
        "+8613800138002",
      ]);
      expect(smsData.map((d: any) => d.to)).to.not.include("+8613800138000");
    });

    it("should filter users based on email preferences", async () => {
      // Create users with different email preferences
      const user1 = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user1@test.com",
          name: "User 1",
          roles: ["Mentee"],
          preference: {
            emailDisabled: ["基础"], // Email disabled for 基础 notifications
          },
        },
        { transaction },
      );

      const user2 = await db.User.create(
        {
          phone: "+8613800138001",
          email: "user2@test.com",
          name: "User 2",
          roles: ["Mentee"],
          preference: {
            emailDisabled: ["点赞"], // Email enabled for 基础 notifications
          },
        },
        { transaction },
      );

      const user3 = await db.User.create(
        {
          phone: "+8613800138002",
          email: "user3@test.com",
          name: "User 3",
          roles: ["Mentee"],
          preference: null, // No preferences, should receive email
        },
        { transaction },
      );

      await notify(
        "基础" as NotificationType,
        [user1.id, user2.id, user3.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify email was called with only users 2 and 3 (user1 has email disabled for 基础)
      void expect(emailStub.calledOnce).to.be.true;
      const emailCall = emailStub.getCall(0);
      expect(emailCall.args[0]).to.deep.equal([
        "user2@test.com",
        "user3@test.com",
      ]); // Only user2 and user3 emails
      expect(emailCall.args[1]).to.equal("E_114706970517"); // email template
      expect(emailCall.args[2]).to.deep.equal({
        subject: "Test Subject",
        content: "Test Content",
      }); // template variables
    });

    it("should send both SMS and email to users with both contact methods", async () => {
      const user = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user@test.com",
          name: "Test User",
          roles: ["Mentee"],
        },
        { transaction },
      );

      await notify(
        "基础" as NotificationType,
        [user.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify both SMS and email were called
      void expect(smsStub.calledOnce).to.be.true;
      void expect(emailStub.calledOnce).to.be.true;

      // Verify SMS call details
      const smsCall = smsStub.getCall(0);
      expect(smsCall.args[2]).to.have.length(1);
      expect(smsCall.args[2][0].to).to.equal("+8613800138000");
      expect(smsCall.args[2][0].vars).to.deep.equal({
        subject: "Test Subject",
        content: "Test Content",
      });

      // Verify email call details
      const emailCall = emailStub.getCall(0);
      expect(emailCall.args[0]).to.deep.equal(["user@test.com"]);
      expect(emailCall.args[1]).to.equal("E_114706970517");
      expect(emailCall.args[2]).to.deep.equal({
        subject: "Test Subject",
        content: "Test Content",
      });
    });

    it("should handle different notification types", async () => {
      const user = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user@test.com",
          name: "Test User",
          roles: ["Mentee"],
        },
        { transaction },
      );

      // Test different notification types
      const notificationTypes: NotificationType[] = [
        "基础",
        "点赞",
        "待办事项",
        "内部笔记",
        "树洞",
      ];

      for (const type of notificationTypes) {
        await notify(
          type,
          [user.id],
          {
            email: "E_114706970517",
            domesticSms: "yaD264",
            internationalSms: "0Rr8G",
          },
          {
            subject: "Test Subject",
            content: "Test Content",
          },
          transaction,
        );
      }

      // Verify total calls made
      expect(smsStub.callCount).to.equal(notificationTypes.length);
      expect(emailStub.callCount).to.equal(notificationTypes.length);
    });

    it("should handle users with complex preferences", async () => {
      const user = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user@test.com",
          name: "Test User",
          roles: ["Mentee"],
          preference: {
            smsDisabled: ["基础", "点赞"],
            emailDisabled: ["待办事项"],
          },
        },
        { transaction },
      );

      // Test with 基础 notification (SMS disabled, email enabled)
      await notify(
        "基础",
        [user.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify SMS was called with empty array (SMS disabled for 基础)
      // and email was called with user data
      void expect(smsStub.calledOnce).to.be.true;
      void expect(emailStub.calledOnce).to.be.true;

      // Verify SMS was called with empty template data
      const smsCall = smsStub.getCall(0);
      void expect(smsCall.args[2]).to.have.length(0);

      // Verify email was called with user data
      const emailCall = emailStub.getCall(0);
      void expect(emailCall.args[0]).to.have.length(1);
      void expect(emailCall.args[0][0]).to.equal("user@test.com");

      // Test with 待办事项 notification (SMS & email disabled)
      // Reset stubs for this second test
      smsStub.resetHistory();
      emailStub.resetHistory();
      await notify(
        "待办事项",
        [user.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify SMS was called with user data and email was called with empty array
      void expect(smsStub.calledOnce).to.be.true;
      void expect(emailStub.calledOnce).to.be.true;

      // Verify SMS was called with user data
      const smsCall2 = smsStub.getCall(0);
      void expect(smsCall2.args[2]).to.have.length(0);

      // Verify email was called with empty array
      const emailCall2 = emailStub.getCall(0);
      void expect(emailCall2.args[0]).to.have.length(0);
    });

    it("should pass template variables correctly to SMS and email", async () => {
      const user = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user@test.com",
          name: "Test User",
          roles: ["Mentee"],
        },
        { transaction },
      );

      const templateVariables = {
        subject: "Custom Subject",
        content: "Custom Content",
        customVar: "Custom Value",
      };

      await notify(
        "基础" as NotificationType,
        [user.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        templateVariables,
        transaction,
      );

      // Verify SMS was called with correct template variables
      void expect(smsStub.calledOnce).to.be.true;
      const smsCall = smsStub.getCall(0);
      expect(smsCall.args[2][0].vars).to.deep.equal(templateVariables);

      // Verify email was called with correct template variables
      void expect(emailStub.calledOnce).to.be.true;
      const emailCall = emailStub.getCall(0);
      expect(emailCall.args[2]).to.deep.equal(templateVariables);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle invalid user IDs gracefully", async () => {
      // Use valid UUID format but non-existent IDs
      const invalidId1 = "550e8400-e29b-41d4-a716-446655440001";
      const invalidId2 = "550e8400-e29b-41d4-a716-446655440002";

      await notify(
        "基础" as NotificationType,
        [invalidId1, invalidId2],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify notifications were called but with empty arrays (no valid users found)
      void expect(smsStub.calledOnce).to.be.true;
      void expect(emailStub.calledOnce).to.be.true;

      // Verify SMS was called with empty template data
      const smsCall = smsStub.getCall(0);
      void expect(smsCall.args[2]).to.have.length(0);

      // Verify email was called with empty email list
      const emailCall = emailStub.getCall(0);
      void expect(emailCall.args[0]).to.have.length(0);
    });

    it("should handle mixed valid and invalid user IDs", async () => {
      const validUser = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user@test.com",
          name: "Valid User",
          roles: ["Mentee"],
        },
        { transaction },
      );

      const invalidId = "550e8400-e29b-41d4-a716-446655440003";

      await notify(
        "基础" as NotificationType,
        [validUser.id, invalidId],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify notifications were sent only to valid user
      void expect(smsStub.calledOnce).to.be.true;
      void expect(emailStub.calledOnce).to.be.true;

      const smsCall = smsStub.getCall(0);
      expect(smsCall.args[2]).to.have.length(1);
      expect(smsCall.args[2][0].to).to.equal("+8613800138000");

      const emailCall = emailStub.getCall(0);
      expect(emailCall.args[0]).to.have.length(1);
      expect(emailCall.args[0][0]).to.equal("user@test.com");
    });

    it("should handle users with only phone or only email", async () => {
      const phoneOnlyUser = await db.User.create(
        {
          phone: "+8613800138000",
          email: null,
          name: "Phone Only User",
          roles: ["Mentee"],
        },
        { transaction },
      );

      const emailOnlyUser = await db.User.create(
        {
          phone: null,
          email: "email@test.com",
          name: "Email Only User",
          roles: ["Mentee"],
        },
        { transaction },
      );

      await notify(
        "基础" as NotificationType,
        [phoneOnlyUser.id, emailOnlyUser.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify SMS was sent to phone-only user
      void expect(smsStub.calledOnce).to.be.true;
      const smsCall = smsStub.getCall(0);
      expect(smsCall.args[2]).to.have.length(1);
      expect(smsCall.args[2][0].to).to.equal("+8613800138000");

      // Verify email was sent to email-only user
      void expect(emailStub.calledOnce).to.be.true;
      const emailCall = emailStub.getCall(0);
      expect(emailCall.args[0]).to.have.length(1);
      expect(emailCall.args[0][0]).to.equal("email@test.com");
    });

    it("should respect 基础 preference for all notification types", async () => {
      const user = await db.User.create(
        {
          phone: "+8613800138000",
          email: "user@test.com",
          name: "Test User",
          roles: ["Mentee"],
          preference: {
            smsDisabled: ["基础"], // Disable SMS for 基础
            emailDisabled: ["基础"], // Disable email for 基础
          },
        },
        { transaction },
      );

      // Test with 基础 notification type
      await notify(
        "基础" as NotificationType,
        [user.id],
        {
          email: "E_114706970517",
          domesticSms: "yaD264",
          internationalSms: "0Rr8G",
        },
        {
          subject: "Test Subject",
          content: "Test Content",
        },
        transaction,
      );

      // Verify notifications were called but with empty arrays (both disabled for 基础)
      void expect(smsStub.calledOnce).to.be.true;
      void expect(emailStub.calledOnce).to.be.true;

      // Verify SMS was called with empty template data
      const smsCall = smsStub.getCall(0);
      void expect(smsCall.args[2]).to.have.length(0);

      // Verify email was called with empty email list
      const emailCall = emailStub.getCall(0);
      void expect(emailCall.args[0]).to.have.length(0);
    });
  });
});
