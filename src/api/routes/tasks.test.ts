import { expect } from "chai";
import {
  createAutoTask,
  listImpl,
  createImpl,
  updateImpl,
  updateDoneImpl,
  getLastTasksUpdatedAtImpl,
  createAutoTasks,
} from "./tasks";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import crypto from "crypto";
import moment from "moment";

describe("Tasks Route Impl", () => {
  let transaction: Transaction;
  let testUser: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    testUser = await db.User.create(
      {
        email: "test_autotask@example.com",
        name: "Test AutoTask User",
        roles: ["Mentor"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  const createTestUser = async (roles: string[] = []): Promise<any> => {
    const user = await db.User.create(
      {
        email: `${crypto.randomUUID()}@example.com`,
        name: "Test User",
        roles,
      },
      { transaction },
    );
    return user.toJSON();
  };

  describe("createAutoTask", () => {
    it("should create a new auto task and schedule notification if it does not exist", async () => {
      await createAutoTask(testUser.id, "study-comms", transaction);

      const task = await db.Task.findOne({
        where: { assigneeId: testUser.id, autoTaskId: "study-comms" },
        transaction,
      });

      void expect(task).to.exist;
      void expect(task?.done).to.be.false;

      const notification = await db.ScheduledNotification.findOne({
        where: { type: "Task", subjectId: testUser.id },
        transaction,
      });

      void expect(notification).to.exist;
    });

    it("should do nothing if an active task already exists", async () => {
      await db.Task.create(
        {
          assigneeId: testUser.id,
          autoTaskId: "study-comms",
          done: false,
        },
        { transaction },
      );

      await db.ScheduledNotification.destroy({
        where: { type: "Task", subjectId: testUser.id },
        transaction,
      });

      await createAutoTask(testUser.id, "study-comms", transaction);

      const taskCount = await db.Task.count({
        where: { assigneeId: testUser.id, autoTaskId: "study-comms" },
        transaction,
      });
      expect(taskCount).to.equal(1);

      const notificationCount = await db.ScheduledNotification.count({
        where: { type: "Task", subjectId: testUser.id },
        transaction,
      });
      expect(notificationCount).to.equal(0);
    });

    it("should reopen the task and schedule notification if the task is already done", async () => {
      await db.Task.create(
        {
          assigneeId: testUser.id,
          autoTaskId: "study-comms",
          done: true,
        },
        { transaction },
      );

      await createAutoTask(testUser.id, "study-comms", transaction);

      const taskCount = await db.Task.count({
        where: { assigneeId: testUser.id, autoTaskId: "study-comms" },
        transaction,
      });
      expect(taskCount).to.equal(1);

      const updatedTask = await db.Task.findOne({
        where: { assigneeId: testUser.id, autoTaskId: "study-comms" },
        transaction,
      });
      void expect(updatedTask?.done).to.be.false;

      const notificationCount = await db.ScheduledNotification.count({
        where: { type: "Task", subjectId: testUser.id },
        transaction,
      });
      expect(notificationCount).to.equal(1);
    });
  });

  describe("createAutoTasks", () => {
    it("should create auto tasks for mentors with expiring exams in ongoing mentorships", async () => {
      const mentorWithExpiringExams = await db.User.create(
        {
          email: `${crypto.randomUUID()}@example.com`,
          name: "Mentor With Expiring Exams",
          roles: ["Mentor"],
          state: {
            commsExam: moment().subtract(336, "days").toDate(),
            handbookExam: moment().subtract(336, "days").toDate(),
          },
        },
        { transaction },
      );

      const mentorWithoutExpiringExams = await db.User.create(
        {
          email: `${crypto.randomUUID()}@example.com`,
          name: "Mentor Without Expiring Exams",
          roles: ["Mentor"],
          state: {
            commsExam: moment().toDate(),
            handbookExam: moment().toDate(),
          },
        },
        { transaction },
      );

      const mentee1 = await createTestUser(["Mentee"]);
      const mentee2 = await createTestUser(["Mentee"]);

      await db.Mentorship.create(
        {
          mentorId: mentorWithExpiringExams.id,
          menteeId: mentee1.id,
          status: "进行中",
          expectedEndAt: new Date(Date.now() + 1000000000),
          summaryRequired: true,
          matchMessage: "",
          transactional: false,
        },
        { transaction },
      );

      await db.Mentorship.create(
        {
          mentorId: mentorWithoutExpiringExams.id,
          menteeId: mentee2.id,
          status: "进行中",
          expectedEndAt: new Date(Date.now() + 1000000000),
          summaryRequired: true,
          matchMessage: "",
          transactional: false,
        },
        { transaction },
      );

      await createAutoTasks(transaction);

      const tasksForMentorWithExpiringExams = await db.Task.findAll({
        where: { assigneeId: mentorWithExpiringExams.id },
        transaction,
      });

      expect(tasksForMentorWithExpiringExams.length).to.equal(2);
      const taskIds = tasksForMentorWithExpiringExams.map((t) => t.autoTaskId);
      expect(taskIds).to.include("study-comms");
      expect(taskIds).to.include("study-handbook");

      const tasksForMentorWithoutExpiringExams = await db.Task.findAll({
        where: { assigneeId: mentorWithoutExpiringExams.id },
        transaction,
      });

      expect(tasksForMentorWithoutExpiringExams.length).to.equal(0);
    });
  });

  describe("listImpl", () => {
    it("should list tasks for self", async () => {
      await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "test task 1",
          done: false,
        },
        { transaction },
      );
      const tasks = await listImpl(
        testUser,
        [testUser.id],
        false,
        false,
        transaction,
      );
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("test task 1");
    });

    it("should list tasks as MentorshipManager", async () => {
      const otherUser = await createTestUser();
      const manager = await createTestUser(["MentorshipManager"]);

      await db.Task.create(
        {
          assigneeId: otherUser.id,
          creatorId: manager.id,
          markdown: "test task 2",
          done: false,
        },
        { transaction },
      );

      const tasks = await listImpl(
        manager,
        [otherUser.id],
        false,
        false,
        transaction,
      );
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("test task 2");
    });

    it("should list a mentee's tasks as their mentor", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const mentee = await createTestUser(["Mentee"]);

      await db.Mentorship.create(
        {
          mentorId: mentor.id,
          menteeId: mentee.id,
          status: "进行中",
          expectedEndAt: new Date(Date.now() + 1000000000),
          summaryRequired: true,
          matchMessage: "",
          transactional: false,
        },
        { transaction },
      );

      await db.Task.create(
        {
          assigneeId: mentee.id,
          creatorId: mentor.id,
          markdown: "test task 3",
          done: false,
        },
        { transaction },
      );

      const tasks = await listImpl(
        mentor,
        [mentee.id],
        false,
        false,
        transaction,
      );
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("test task 3");
    });

    it("should fail when a mentor tries to list tasks of someone they don't mentor", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const otherUser = await createTestUser(["Mentee"]);

      try {
        await listImpl(mentor, [otherUser.id], false, false, transaction);
        expect.fail("Should have thrown noPermissionError");
      } catch (error: any) {
        expect(error.code).to.equal("FORBIDDEN");
      }
    });
  });

  describe("createImpl", () => {
    it("should create a task successfully", async () => {
      const assignee = await createTestUser();
      await createImpl(testUser, assignee.id, "New Task", transaction);

      const tasks = await db.Task.findAll({
        where: { assigneeId: assignee.id },
        transaction,
      });
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("New Task");

      const notification = await db.ScheduledNotification.findOne({
        where: { type: "Task", subjectId: assignee.id },
        transaction,
      });
      void expect(notification).to.exist;
    });

    it("should fail when markdown is empty", async () => {
      const assignee = await createTestUser();
      try {
        await createImpl(testUser, assignee.id, "   ", transaction);
        expect.fail("Should have thrown generalBadRequestError");
      } catch (error: any) {
        expect(error.code).to.equal("BAD_REQUEST");
      }
    });
  });

  describe("updateImpl", () => {
    it("should update an existing task owned by the user", async () => {
      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "Old Task",
          done: false,
        },
        { transaction },
      );

      await updateImpl(
        testUser,
        task.id,
        testUser.id,
        "Updated Task",
        transaction,
      );

      const updatedTask = await db.Task.findByPk(task.id, { transaction });
      expect(updatedTask?.markdown).to.equal("Updated Task");

      const notification = await db.ScheduledNotification.findOne({
        where: { type: "Task", subjectId: testUser.id },
        transaction,
      });
      void expect(notification).to.exist;
    });

    it("should fail on unauthorized updates", async () => {
      const otherUser = await createTestUser();
      const task = await db.Task.create(
        {
          assigneeId: otherUser.id,
          creatorId: otherUser.id,
          markdown: "Old Task",
          done: false,
        },
        { transaction },
      );

      try {
        await updateImpl(
          testUser,
          task.id,
          otherUser.id,
          "Updated Task",
          transaction,
        );
        expect.fail("Should have thrown noPermissionError");
      } catch (error: any) {
        expect(error.code).to.equal("FORBIDDEN");
      }
    });

    it("should fail on empty text update", async () => {
      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "Old Task",
          done: false,
        },
        { transaction },
      );

      try {
        await updateImpl(testUser, task.id, testUser.id, "   ", transaction);
        expect.fail("Should have thrown generalBadRequestError");
      } catch (error: any) {
        expect(error.code).to.equal("BAD_REQUEST");
      }
    });
  });

  describe("updateDoneImpl", () => {
    it("should toggle a task's done status", async () => {
      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "My Task",
          done: false,
        },
        { transaction },
      );

      await updateDoneImpl(testUser, task.id, true, transaction);
      let updatedTask = await db.Task.findByPk(task.id, { transaction });
      void expect(updatedTask?.done).to.be.true;

      await updateDoneImpl(testUser, task.id, false, transaction);
      updatedTask = await db.Task.findByPk(task.id, { transaction });
      void expect(updatedTask?.done).to.be.false;
    });

    it("should fail when user lacks permission to toggle task", async () => {
      const otherUser = await createTestUser();
      const task = await db.Task.create(
        {
          assigneeId: otherUser.id,
          creatorId: otherUser.id,
          markdown: "Other Task",
          done: false,
        },
        { transaction },
      );

      try {
        await updateDoneImpl(testUser, task.id, true, transaction);
        expect.fail("Should have thrown noPermissionError");
      } catch (error: any) {
        expect(error.code).to.equal("FORBIDDEN");
      }
    });

    it("should fail to manually toggle an auto-task", async () => {
      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          autoTaskId: "study-comms",
          done: false,
        },
        { transaction },
      );

      try {
        await updateDoneImpl(testUser, task.id, true, transaction);
        expect.fail("Should have thrown noPermissionError");
      } catch (error: any) {
        expect(error.code).to.equal("FORBIDDEN");
      }
    });
  });

  describe("getLastTasksUpdatedAtImpl", () => {
    it("should identify the last updated timestamp for tasks assigned to the user", async () => {
      const otherUser = await createTestUser();

      const beforeDate = await getLastTasksUpdatedAtImpl(testUser, transaction);

      const task = await db.Task.create(
        {
          creatorId: otherUser.id,
          assigneeId: testUser.id,
          markdown: "Incomplete Task",
          done: false,
        },
        { transaction },
      );

      const afterDate = await getLastTasksUpdatedAtImpl(testUser, transaction);

      expect(moment(afterDate).toDate().getTime()).to.be.greaterThan(
        moment(beforeDate).toDate().getTime(),
      );
      expect(moment(afterDate).toDate().getTime()).to.equal(
        task.updatedAt.getTime(),
      );
    });
  });
});
