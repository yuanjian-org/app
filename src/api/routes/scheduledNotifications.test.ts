import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  scheduleNotification,
  sendScheduledNotifications,
} from "./scheduledNotifications";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";
import * as notifyModule from "../notify";
import crypto from "crypto";
import moment from "moment";

describe("scheduledNotifications", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("scheduleNotification", () => {
    it("should successfully schedule a new notification", async () => {
      const type = "Kudos";
      const subjectId = uuidv4();

      await scheduleNotification(type, subjectId, transaction);

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
      await scheduleNotification(type, subjectId, transaction);

      // Attempt to schedule again with the same type and subjectId
      await scheduleNotification(type, subjectId, transaction);

      // Verify that only one notification exists
      const count = await db.ScheduledNotification.count({
        where: { type, subjectId },
        transaction,
      });

      expect(count).to.equal(1);
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

      const count = await db.ScheduledNotification.count({ transaction });
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

      const count = await db.ScheduledNotification.count({ transaction });
      expect(count).to.equal(0);
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

      const count = await db.ScheduledNotification.count({ transaction });
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

      const count = await db.ScheduledNotification.count({ transaction });
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

      const count = await db.ScheduledNotification.count({ transaction });
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

      expect(notifyStub.callCount).to.be.at.least(2); // At least two calls: one for mentor, one for the admin created in the test
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

      const count = await db.ScheduledNotification.count({ transaction });
      expect(count).to.equal(0);
    });

    it("should throw error for unknown notification type", async () => {
      const past = moment().subtract(6, "minutes").toDate();
      await db.ScheduledNotification.create(
        { type: "Task", subjectId: uuidv4(), createdAt: past },
        { transaction },
      );

      // Update the type to an invalid value using a raw query, bypassing validation
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
      // when no transaction is provided, processing any existing or empty queue.
      // This is sufficient to reach the 'await sequelize.transaction(doWork);' branch.
      await sendScheduledNotifications();
    });
  });
});
