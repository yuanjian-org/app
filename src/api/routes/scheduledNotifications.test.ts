import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  getNextShudongDailyDigestSendTime,
  scheduleNotificationBeforeSavingData,
  sendScheduledNotifications,
} from "./scheduledNotifications";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";
import * as notifyModule from "../notify";
import crypto from "crypto";
import moment from "moment-timezone";

describe("scheduledNotifications", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    await db.ScheduledNotification.destroy({ where: {}, transaction });
    await db.GlobalConfig.destroy({ where: {}, transaction });
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("scheduleNotificationBeforeSavingData", () => {
    it("should successfully schedule a new notification", async () => {
      const type = "Kudos";
      const subjectId = uuidv4();

      await scheduleNotificationBeforeSavingData(type, subjectId, transaction);

      const count = await db.ScheduledNotification.count({
        where: { type, subjectId },
        transaction,
      });

      expect(count).to.equal(1);
    });

    it("should not schedule a duplicate notification if one already exists", async () => {
      const type = "Task";
      const subjectId = uuidv4();

      // Schedule the first time
      await scheduleNotificationBeforeSavingData(type, subjectId, transaction);

      // Attempt to schedule again with the same type and subjectId
      await scheduleNotificationBeforeSavingData(type, subjectId, transaction);

      // Verify that only one notification exists
      const count = await db.ScheduledNotification.count({
        where: { type, subjectId },
        transaction,
      });

      expect(count).to.equal(1);
    });

    it("should skip scheduling Shudong notification when disabled globally", async () => {
      await db.GlobalConfig.create(
        { data: { enableShudongNotifications: false } },
        { transaction },
      );

      const type = "ShudongQuestion";
      const subjectId = uuidv4();

      await scheduleNotificationBeforeSavingData(type, subjectId, transaction);

      const count = await db.ScheduledNotification.count({
        where: { type, subjectId },
        transaction,
      });

      expect(count).to.equal(0);
    });
  });

  describe("sendScheduledNotifications", () => {
    let notifyStub: sinon.SinonStub;

    beforeEach(() => {
      notifyStub = sinon.stub(notifyModule, "notify").resolves();
      sinon.stub(notifyModule, "notifyRolesIgnoreError").resolves();
    });

    afterEach(() => {
      sinon.restore();
    });

    const createTestUser = async (name: string, roles: string[] = []) => {
      const email = `${crypto.randomUUID()}@example.com`;
      const user = await db.User.create(
        { email, name, roles },
        { transaction },
      );
      return user;
    };

    it("should skip notifications delayed less than 5 minutes", async () => {
      const user = await createTestUser("User");
      await db.ScheduledNotification.create(
        { type: "Kudos", subjectId: user.id },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.called).to.equal(false);

      const count = await db.ScheduledNotification.count({
        where: { type: "Kudos", subjectId: user.id },
        transaction,
      });
      expect(count).to.equal(1);
    });

    it("should notify kudos and delete the notification", async () => {
      const receiver = await createTestUser("Receiver");
      const giver = await createTestUser("Giver");

      await db.Kudos.create(
        {
          receiverId: receiver.id,
          giverId: giver.id,
          text: "Great job!",
          isInternal: false,
        },
        { transaction },
      );

      await db.Kudos.create(
        {
          receiverId: receiver.id,
          giverId: giver.id,
          text: null,
          isInternal: false,
        },
        { transaction },
      );

      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Kudos", subjectId: receiver.id, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.calledOnce).to.equal(true);
      const callArgs = notifyStub.getCall(0).args;
      expect(callArgs[0]).to.equal("点赞");
      expect(callArgs[1]).to.deep.equal([receiver.id]);
      expect(callArgs[3].name).to.equal("er");
      expect(callArgs[3].delta).to.include("刚刚夸了你");
      expect(callArgs[3].delta).to.include("刚刚给你点了 1 个赞");

      const count = await db.ScheduledNotification.count({
        where: { type: "Kudos", subjectId: receiver.id },
        transaction,
      });
      expect(count).to.equal(0);
    });

    it("should skip Shudong notifications when disabled globally", async () => {
      await db.GlobalConfig.create(
        { data: { enableShudongNotifications: false } },
        { transaction },
      );

      const poster = await createTestUser("Poster");
      const subscriber = await createTestUser("Subscriber");
      const responder = await createTestUser("Responder");

      const q = await db.ShudongPost.create(
        {
          authorId: poster.id,
          markdown: "Sample question?",
          isAnonymous: false,
        },
        { transaction },
      );

      await db.ShudongSubscription.create(
        { questionId: q.id, userId: subscriber.id },
        { transaction },
      );

      await db.ShudongPost.create(
        {
          parentId: q.id,
          authorId: responder.id,
          markdown: "Sample response!",
          isAnonymous: false,
        },
        { transaction },
      );

      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "ShudongResponse", subjectId: q.id, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.called).to.equal(false);
    });

    it("should notify shudong subscribers and delete notification", async () => {
      const poster = await createTestUser("Poster");
      const subscriber = await createTestUser("Subscriber");
      const dailyDigestSub = await createTestUser("DailyDigestSub");
      await dailyDigestSub.update(
        { preference: { shudongNotificationFrequency: "daily" } },
        { transaction },
      );
      const responder = await createTestUser("Responder");

      const q = await db.ShudongPost.create(
        {
          authorId: poster.id,
          markdown: "Sample question?",
          isAnonymous: false,
        },
        { transaction },
      );

      // Subscribe poster, another subscriber, a daily-digest subscriber, and
      // the responder to verify eligible immediate recipients are batched into
      // a single notify() call while daily-digest users and the responder are
      // excluded.
      await db.ShudongSubscription.bulkCreate(
        [
          { questionId: q.id, userId: poster.id },
          { questionId: q.id, userId: subscriber.id },
          { questionId: q.id, userId: dailyDigestSub.id },
          { questionId: q.id, userId: responder.id },
        ],
        { transaction },
      );

      await db.ShudongPost.create(
        {
          parentId: q.id,
          authorId: responder.id,
          markdown: "Sample response!",
          isAnonymous: false,
        },
        { transaction },
      );

      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "ShudongResponse", subjectId: q.id, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.calledOnce).to.equal(true);
      const args = notifyStub.getCall(0).args;
      expect(args[0]).to.equal("树洞");
      expect(args[1]).to.have.members([poster.id, subscriber.id]);
      expect(args[1]).to.not.include(dailyDigestSub.id);
      expect(args[1]).to.not.include(responder.id);
      // Verify notification template IDs configured for Shudong response.
      expect(args[2].email).to.equal("E_114703550737");
      expect(args[2].domesticSms).to.equal("cFcyM4");
      expect(args[2].internationalSms).to.equal("sVrjE");
      expect(args[3].questionMarkdown).to.equal("Sample question?");
      expect(args[3].questionLink).to.include(q.id);

      const count = await db.ScheduledNotification.count({
        where: { type: "ShudongResponse", subjectId: q.id },
        transaction,
      });
      expect(count).to.equal(0);
    });

    it("should notify global subscribers of new questions", async () => {
      // A mentor with default preference is globally subscribed.
      const poster = await createTestUser("Poster", ["Mentor"]);
      const mentor = await createTestUser("Mentor", ["Mentor"]);
      const optedIn = await createTestUser("OptedIn");
      await optedIn.update(
        { preference: { shudongSubscribeAll: "yes" } },
        { transaction },
      );
      const optedInWithResponses = await createTestUser("OptedInWithResponses");
      await optedInWithResponses.update(
        { preference: { shudongSubscribeAll: "yesWithResponses" } },
        { transaction },
      );
      const dailyDigestMentor = await createTestUser("DailyDigestMentor", [
        "Mentor",
      ]);
      await dailyDigestMentor.update(
        { preference: { shudongNotificationFrequency: "daily" } },
        { transaction },
      );
      const optedOut = await createTestUser("OptedOut", ["Mentor"]);
      await optedOut.update(
        { preference: { shudongSubscribeAll: "no" } },
        { transaction },
      );
      const other = await createTestUser("Other");

      await db.ShudongPost.create(
        { authorId: poster.id, markdown: "New question?", isAnonymous: false },
        { transaction },
      );

      const subjectId = "00000000-0000-0000-0000-000000000000";
      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "ShudongQuestion", subjectId, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.calledOnce).to.equal(true);
      const args = notifyStub.getCall(0).args;
      expect(args[0]).to.equal("树洞");
      expect(args[1]).to.include(mentor.id);
      expect(args[1]).to.include(optedIn.id);
      expect(args[1]).to.include(optedInWithResponses.id);
      // The poster and daily-digest users are excluded from immediate alerts.
      expect(args[1]).to.not.include(poster.id);
      expect(args[1]).to.not.include(dailyDigestMentor.id);
      expect(args[1]).to.not.include(optedOut.id);
      expect(args[1]).to.not.include(other.id);
      // Verify notification template IDs configured for Shudong question.
      expect(args[2].email).to.equal("E_114705350039");
      expect(args[2].domesticSms).to.equal("ep7Wd3");
      expect(args[2].internationalSms).to.equal("DyvYZ");
      expect(args[3]).to.deep.equal({});

      const count = await db.ScheduledNotification.count({
        where: { type: "ShudongQuestion", subjectId },
        transaction,
      });
      expect(count).to.equal(0);
    });

    it("computes next 20:00 Beijing Time for ShudongDailyDigest", () => {
      const morning = moment.tz("2026-11-15 09:30:00", "Asia/Shanghai");
      expect(getNextShudongDailyDigestSendTime(morning).format()).to.equal(
        moment.tz("2026-11-15 20:00:00", "Asia/Shanghai").format(),
      );

      const exact20 = moment.tz("2026-11-15 20:00:00", "Asia/Shanghai");
      expect(getNextShudongDailyDigestSendTime(exact20).format()).to.equal(
        moment.tz("2026-11-16 20:00:00", "Asia/Shanghai").format(),
      );

      const evening = moment.tz("2026-11-15 20:15:00", "Asia/Shanghai");
      expect(getNextShudongDailyDigestSendTime(evening).format()).to.equal(
        moment.tz("2026-11-16 20:00:00", "Asia/Shanghai").format(),
      );
    });

    it("delays ShudongDailyDigest until next 20:00 Beijing Time", async () => {
      const subjectId = "00000000-0000-0000-0000-000000000000";
      await db.ScheduledNotification.create(
        { type: "ShudongDailyDigest", subjectId, createdAt: new Date() },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.called).to.equal(false);
      const count = await db.ScheduledNotification.count({
        where: { type: "ShudongDailyDigest", subjectId },
        transaction,
      });
      expect(count).to.equal(1);
    });

    it("sends personalized ShudongDailyDigest after 20:00 CST", async () => {
      const poster = await createTestUser("Poster");
      const responder = await createTestUser("Responder");

      const mentorDigest = await createTestUser("王导师", ["Mentor"]);
      await mentorDigest.update(
        { preference: { shudongNotificationFrequency: "daily" } },
        { transaction },
      );

      const menteeDigest = await createTestUser("李同学");
      await menteeDigest.update(
        {
          preference: {
            shudongSubscribeAll: "no",
            shudongNotificationFrequency: "daily",
          },
        },
        { transaction },
      );

      const quietDigest = await createTestUser("QuietDigest");
      await quietDigest.update(
        {
          preference: {
            shudongSubscribeAll: "no",
            shudongNotificationFrequency: "daily",
          },
        },
        { transaction },
      );

      const immediateMentor = await createTestUser("ImmediateMentor", [
        "Mentor",
      ]);

      const subjectId = "00000000-0000-0000-0000-000000000000";
      const windowStart = moment().subtract(25, "hours").toDate();
      // Hide any pre-existing posts in the local DB so counts are deterministic
      await db.ShudongPost.update(
        { deletedAt: new Date() },
        { where: { deletedAt: null }, transaction },
      );
      await db.ScheduledNotification.create(
        { type: "ShudongDailyDigest", subjectId, createdAt: windowStart },
        { transaction },
      );

      const q1 = await db.ShudongPost.create(
        {
          authorId: poster.id,
          markdown: "Question <1> about internships?",
          isAnonymous: false,
        },
        { transaction },
      );
      await db.ShudongPost.create(
        {
          authorId: mentorDigest.id,
          markdown: "Mentor own question",
          isAnonymous: false,
        },
        { transaction },
      );
      const q3 = await db.ShudongPost.create(
        {
          authorId: poster.id,
          markdown: "Second question from poster",
          isAnonymous: false,
        },
        { transaction },
      );

      await db.ShudongSubscription.bulkCreate(
        [
          { questionId: q1.id, userId: mentorDigest.id },
          { questionId: q1.id, userId: menteeDigest.id },
        ],
        { transaction },
      );

      const r1 = await db.ShudongPost.create(
        {
          parentId: q1.id,
          authorId: responder.id,
          markdown: "Direct reply",
          isAnonymous: false,
        },
        { transaction },
      );
      await db.ShudongPost.create(
        {
          parentId: r1.id,
          authorId: responder.id,
          markdown: "Nested sub-reply",
          isAnonymous: false,
        },
        { transaction },
      );
      await db.ShudongPost.create(
        {
          parentId: q1.id,
          authorId: menteeDigest.id,
          markdown: "Mentee own reply",
          isAnonymous: false,
        },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      // At least two calls (mentorDigest and menteeDigest); pre-existing daily
      // digest users in a local DB may also receive a digest.
      expect(notifyStub.callCount).to.be.at.least(2);
      const callsByUser = new Map<string, sinon.SinonSpyCall>();
      for (const call of notifyStub.getCalls()) {
        callsByUser.set(call.args[1][0], call);
      }
      expect(callsByUser.has(quietDigest.id)).to.equal(false);
      expect(callsByUser.has(immediateMentor.id)).to.equal(false);
      expect(callsByUser.has(poster.id)).to.equal(false);

      const mentorCall = callsByUser.get(mentorDigest.id);
      expect(mentorCall).to.not.equal(undefined);
      expect(mentorCall!.args[0]).to.equal("树洞");
      expect(mentorCall!.args[2]).to.deep.equal({
        email: "E_114704061630",
        domesticSms: "c4qSN3",
        internationalSms: "zgkZJ3",
      });
      // Mentor sees q1 & q3 (not own question) and 3 replies on q1.
      expect(mentorCall!.args[3].name).to.equal("导师");
      expect(mentorCall!.args[3].summary).to.equal("2 个新问题、3 条新回复");
      expect(mentorCall!.args[3].delta).to.include("&lt;1&gt;");
      expect(mentorCall!.args[3].delta).to.include(q3.id);
      expect(mentorCall!.args[3].delta).to.not.include("Mentor own question");
      expect(mentorCall!.args[3].delta).to.include("3 条新回复");

      const menteeCall = callsByUser.get(menteeDigest.id);
      expect(menteeCall).to.not.equal(undefined);
      // Mentee only subscribed to q1 and excludes own reply -> 2 replies.
      expect(menteeCall!.args[3].name).to.equal("同学");
      expect(menteeCall!.args[3].summary).to.equal("2 条新回复");
      expect(menteeCall!.args[3].delta).to.not.include("新问题（");
      expect(menteeCall!.args[3].delta).to.include("2 条新回复");

      const remaining = await db.ScheduledNotification.count({
        where: { type: "ShudongDailyDigest", subjectId },
        transaction,
      });
      expect(remaining).to.equal(0);
    });

    it("should not notify tasks if there are no tasks", async () => {
      const assignee = await createTestUser("Assignee");

      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Task", subjectId: assignee.id, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.called).to.equal(false);

      const count = await db.ScheduledNotification.count({
        where: { type: "Task", subjectId: assignee.id },
        transaction,
      });
      expect(count).to.equal(0);
    });

    it("should notify tasks and delete the notification", async () => {
      const assignee = await createTestUser("Assignee");
      const creator = await createTestUser("Creator");

      await db.Task.create(
        {
          assigneeId: assignee.id,
          creatorId: creator.id,
          description: "Test task",
          markdown: "Test task markdown",
          done: false,
        },
        { transaction },
      );

      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Task", subjectId: assignee.id, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.calledOnce).to.equal(true);
      const callArgs = notifyStub.getCall(0).args;
      expect(callArgs[0]).to.equal("待办事项");
      expect(callArgs[1]).to.deep.equal([assignee.id]);
      expect(callArgs[3].name).to.equal("ee");
      expect(callArgs[3].delta).to.include("Test task");

      const count = await db.ScheduledNotification.count({
        where: { type: "Task", subjectId: assignee.id },
        transaction,
      });
      expect(count).to.equal(0);
    });

    it("should not notify chat if no messages", async () => {
      const mentee = await createTestUser("Mentee");
      const mentor = await createTestUser("Mentor");

      const room = await db.ChatRoom.create(
        { menteeId: mentee.id },
        { transaction },
      );

      await db.Mentorship.create(
        {
          menteeId: mentee.id,
          mentorId: mentor.id,
          status: "active",
          transactional: false,
        },
        { transaction },
      );

      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Chat", subjectId: room.id, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      expect(notifyStub.called).to.equal(false);

      const count = await db.ScheduledNotification.count({
        where: { type: "Chat", subjectId: room.id },
        transaction,
      });
      expect(count).to.equal(0);
    });

    it("should notify chat and delete the notification", async () => {
      const mentee = await createTestUser("Mentee");
      const mentor = await createTestUser("Mentor");
      const admin = await createTestUser("Admin", ["MentorshipAdmin"]);

      const room = await db.ChatRoom.create(
        { menteeId: mentee.id },
        { transaction },
      );

      await db.Mentorship.create(
        {
          menteeId: mentee.id,
          mentorId: mentor.id,
          status: "active",
          transactional: false,
        },
        { transaction },
      );

      await db.ChatMessage.create(
        {
          roomId: room.id,
          userId: mentee.id, // mentee sends a message
          markdown: "Hello!",
          format: "markdown",
        },
        { transaction },
      );

      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Chat", subjectId: room.id, createdAt: past },
        { transaction },
      );

      await sendScheduledNotifications(transaction);

      // At least two calls: one for mentor, one for the admin created in the
      // test
      expect(notifyStub.callCount).to.be.at.least(2);
      const mentorCall = notifyStub
        .getCalls()
        .find((call) => call.args[1][0] === mentor.id);
      const adminCall = notifyStub
        .getCalls()
        .find((call) => call.args[1][0] === admin.id);

      expect(mentorCall !== undefined).to.equal(true);
      expect(adminCall !== undefined).to.equal(true);

      const mentorArgs = mentorCall!.args;
      expect(mentorArgs[0]).to.equal("内部笔记");
      expect(mentorArgs[3].menteeName).to.equal("Mentee");
      expect(mentorArgs[3].authors).to.equal("Mentee");
      expect(mentorArgs[3].delta).to.include("Hello!");

      const count = await db.ScheduledNotification.count({
        where: { type: "Chat", subjectId: room.id },
        transaction,
      });
      expect(count).to.equal(0);
    });

    it("should throw error for unknown notification type", async () => {
      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Task", subjectId: uuidv4(), createdAt: past },
        { transaction },
      );

      // Update the type to an invalid value using a raw query, bypassing
      // validation
      await sequelize.query(
        `UPDATE "ScheduledNotifications" SET type = 'UnknownType'`,
        { transaction },
      );

      try {
        await sendScheduledNotifications(transaction);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.include('get type = "UnknownType"');
      }
    });

    it("should throw error when tasks assignee is not found", async () => {
      const assigneeId = uuidv4();
      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Task", subjectId: assigneeId, createdAt: past },
        { transaction },
      );

      try {
        await sendScheduledNotifications(transaction);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.include(`Assignee not found: ${assigneeId}`);
      }
    });

    it("should throw error when kudos receiver is not found", async () => {
      const receiverId = uuidv4();
      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Kudos", subjectId: receiverId, createdAt: past },
        { transaction },
      );

      try {
        await sendScheduledNotifications(transaction);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.include(`User not found: ${receiverId}`);
      }
    });

    it("should throw error when chat room is not found", async () => {
      const roomId = uuidv4();
      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Chat", subjectId: roomId, createdAt: past },
        { transaction },
      );

      try {
        await sendScheduledNotifications(transaction);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.include(`Chat room not found: ${roomId}`);
      }
    });

    it("should process notifications when no transaction is provided", async () => {
      // Instead of committing a test user and leaving it in the database,
      // we just verify that sendScheduledNotifications executes without error
      // when no transaction is provided, processing any existing or empty
      // queue. This is sufficient to reach the
      // 'await sequelize.transaction(doWork);' branch.
      await sendScheduledNotifications();
    });
  });
});
