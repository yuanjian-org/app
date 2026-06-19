import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  scheduleNotification,
  sendScheduledNotificationsImpl,
} from "./scheduledNotifications";
import { v4 as uuidv4 } from "uuid";
import sinon from "sinon";
import * as notifyModule from "api/notify";
import moment from "moment";

describe("scheduledNotifications", () => {
  let transaction: Transaction;
  let notifyStub: sinon.SinonStub;
  let notifyRolesStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    notifyStub = sinon.stub(notifyModule, "notify").resolves();
    notifyRolesStub = sinon.stub(notifyModule, "notifyRolesIgnoreError").returns();
  });

  afterEach(async () => {
    await transaction.rollback();
    sinon.restore();
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

  describe("sendScheduledNotificationsImpl", () => {
    it("should delay sending if the notification is too recent", async () => {
      const subjectId = uuidv4();
      await db.ScheduledNotification.create(
        {
          type: "Task",
          subjectId,
          createdAt: moment().toDate(),
        },
        { transaction },
      );

      await sendScheduledNotificationsImpl(transaction);

      const count = await db.ScheduledNotification.count({
        where: { subjectId },
        transaction,
      });

      // Notification shouldn't be deleted since it was delayed
      expect(count).to.equal(1);
      expect(notifyStub.called).to.be.false;
    });

    it("should process and delete Task notifications if old enough", async () => {
      const user = await db.User.create(
        {
          id: uuidv4(),
          name: "Test User",
          email: "test@example.com",
          roles: [],
        },
        { transaction },
      );

      const creator = await db.User.create(
        {
          id: uuidv4(),
          name: "Creator User",
          email: "creator@example.com",
          roles: [],
        },
        { transaction },
      );

      const task = await db.Task.create(
        {
          assigneeId: user.id,
          creatorId: creator.id,
          markdown: "Test Task",
          done: false,
        },
        { transaction },
      );

      const pastDate = moment().subtract(10, "minutes").toDate();
      const notification = await db.ScheduledNotification.create(
        {
          type: "Task",
          subjectId: user.id,
          createdAt: pastDate,
        },
        { transaction },
      );

      // Force the task update time to be after the scheduled notification time
      // so it gets picked up.
      await db.Task.update(
        { updatedAt: moment().subtract(5, "minutes").toDate() },
        { where: { id: task.id }, transaction },
      );

      await sendScheduledNotificationsImpl(transaction);

      const count = await db.ScheduledNotification.count({
        where: { id: notification.id },
        transaction,
      });

      expect(count).to.equal(0);
      expect(notifyStub.calledOnce).to.be.true;
      expect(notifyRolesStub.calledOnce).to.be.true;
    });

    it("should process and delete Task notifications even if no tasks remain", async () => {
      const user = await db.User.create(
        {
          id: uuidv4(),
          name: "Test User",
          email: "test2@example.com",
          roles: [],
        },
        { transaction },
      );

      const pastDate = moment().subtract(10, "minutes").toDate();
      const notification = await db.ScheduledNotification.create(
        {
          type: "Task",
          subjectId: user.id,
          createdAt: pastDate,
        },
        { transaction },
      );

      await sendScheduledNotificationsImpl(transaction);

      const count = await db.ScheduledNotification.count({
        where: { id: notification.id },
        transaction,
      });

      // It should delete the notification, but NOT call notify since there are no tasks
      expect(count).to.equal(0);
      expect(notifyStub.called).to.be.false;
    });

    it("should process Kudos notifications", async () => {
      const giver = await db.User.create(
        {
          id: uuidv4(),
          name: "Giver User",
          email: "giver@example.com",
          roles: [],
        },
        { transaction },
      );

      const receiver = await db.User.create(
        {
          id: uuidv4(),
          name: "Receiver User",
          email: "receiver@example.com",
          roles: [],
          likes: 1,
          kudos: 1,
        },
        { transaction },
      );

      await db.Kudos.create(
        {
          giverId: giver.id,
          receiverId: receiver.id,
          text: "Great job!",
        },
        { transaction },
      );

      await db.Kudos.create(
        {
          giverId: giver.id,
          receiverId: receiver.id,
          text: null, // Like
        },
        { transaction },
      );

      const pastDate = moment().subtract(10, "minutes").toDate();
      const notification = await db.ScheduledNotification.create(
        {
          type: "Kudos",
          subjectId: receiver.id,
          createdAt: pastDate,
        },
        { transaction },
      );

      // Make sure the kudos have valid timestamps
      await db.Kudos.update(
        { createdAt: moment().toDate() },
        { where: { receiverId: receiver.id }, transaction },
      );

      await sendScheduledNotificationsImpl(transaction);

      const count = await db.ScheduledNotification.count({
        where: { id: notification.id },
        transaction,
      });

      expect(count).to.equal(0);
      expect(notifyStub.calledOnce).to.be.true;
      expect(notifyRolesStub.calledOnce).to.be.true;
    });

    it("should process Chat notifications", async () => {
      const mentee = await db.User.create(
        {
          id: uuidv4(),
          name: "Mentee User",
          email: "mentee@example.com",
          roles: [],
        },
        { transaction },
      );

      const mentor = await db.User.create(
        {
          id: uuidv4(),
          name: "Mentor User",
          email: "mentor@example.com",
          roles: [],
        },
        { transaction },
      );

      const room = await db.ChatRoom.create(
        {
          id: uuidv4(),
          menteeId: mentee.id,
        },
        { transaction },
      );

      await db.Mentorship.create(
        {
          id: uuidv4(),
          menteeId: mentee.id,
          mentorId: mentor.id,
          transactional: false,
          startsAt: moment().toDate(),
          endsAt: null,
          role: "Mentor",
          state: {},
        },
        { transaction },
      );

      await db.ChatMessage.create(
        {
          id: uuidv4(),
          roomId: room.id,
          userId: mentee.id,
          markdown: "Hello World",
        },
        { transaction },
      );

      const pastDate = moment().subtract(10, "minutes").toDate();
      const notification = await db.ScheduledNotification.create(
        {
          type: "Chat",
          subjectId: room.id,
          createdAt: pastDate,
        },
        { transaction },
      );

      // Make sure the chat has a valid timestamp
      await db.ChatMessage.update(
        { createdAt: moment().toDate() },
        { where: { roomId: room.id }, transaction },
      );

      await sendScheduledNotificationsImpl(transaction);

      const count = await db.ScheduledNotification.count({
        where: { id: notification.id },
        transaction,
      });

      expect(count).to.equal(0);
      // It should call notify once since we only have one mentorship
      expect(notifyStub.calledOnce).to.be.true;
    });

  });
});
