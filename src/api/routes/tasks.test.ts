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
import { TRPCError } from "@trpc/server";

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

    it("should list tasks as MentorshipAdmin", async () => {
      const otherUser = await createTestUser();
      const manager = await createTestUser(["MentorshipAdmin"]);

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

    it("should include tasks created by the user if includeTasksCreatedByMe is true", async () => {
      const otherUser = await createTestUser();

      await db.Task.create(
        {
          assigneeId: otherUser.id,
          creatorId: testUser.id,
          markdown: "test task I created",
          done: false,
        },
        { transaction },
      );

      const tasks = await listImpl(testUser, [], true, false, transaction);
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("test task I created");
    });

    it("should not include tasks created by the user if includeTasksCreatedByMe is false", async () => {
      const otherUser = await createTestUser();

      await db.Task.create(
        {
          assigneeId: otherUser.id,
          creatorId: testUser.id,
          markdown: "test task I created",
          done: false,
        },
        { transaction },
      );

      const tasks = await listImpl(testUser, [], false, false, transaction);
      expect(tasks.length).to.equal(0);
    });

    it("should return done tasks if includeDoneTasks is true", async () => {
      await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "done task",
          done: true,
        },
        { transaction },
      );

      const tasks = await listImpl(
        testUser,
        [testUser.id],
        false,
        true,
        transaction,
      );
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("done task");
    });

    it("should not return done tasks if includeDoneTasks is false", async () => {
      await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "done task",
          done: true,
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
      expect(tasks.length).to.equal(0);
    });
  });

  describe("createImpl", () => {
    it("should create a task for self successfully", async () => {
      await createImpl(testUser, testUser.id, "New Task", transaction);

      const tasks = await db.Task.findAll({
        where: { assigneeId: testUser.id },
        transaction,
      });
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("New Task");

      const notification = await db.ScheduledNotification.findOne({
        where: { type: "Task", subjectId: testUser.id },
        transaction,
      });
      void expect(notification).to.exist;
    });

    it("should allow MentorshipAdmin to assign to another user", async () => {
      const admin = await createTestUser(["MentorshipAdmin"]);
      const assignee = await createTestUser(["Mentee"]);

      await createImpl(admin, assignee.id, "Admin Task", transaction);

      const tasks = await db.Task.findAll({
        where: { assigneeId: assignee.id },
        transaction,
      });
      expect(tasks.length).to.equal(1);
      expect(tasks[0].markdown).to.equal("Admin Task");
    });

    it("should allow mentor and mentee in mentorship to assign", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const mentee = await createTestUser(["Mentee"]);
      await db.Mentorship.create(
        {
          mentorId: mentor.id,
          menteeId: mentee.id,
          transactional: false,
          endsAt: null,
        },
        { transaction },
      );

      await createImpl(mentor, mentee.id, "For Mentee", transaction);
      await createImpl(mentee, mentor.id, "For Mentor", transaction);

      const menteeTasks = await db.Task.findAll({
        where: { assigneeId: mentee.id },
        transaction,
      });
      const mentorTasks = await db.Task.findAll({
        where: { assigneeId: mentor.id },
        transaction,
      });
      expect(menteeTasks.length).to.equal(1);
      expect(mentorTasks.length).to.equal(1);
    });

    it("should reject assigning a task to an unrelated user", async () => {
      const victim = await createTestUser(["Mentee"]);

      let caught: unknown;
      try {
        await createImpl(testUser, victim.id, "Spam Task", transaction);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("FORBIDDEN");

      const taskCount = await db.Task.count({
        where: { assigneeId: victim.id },
        transaction,
      });
      expect(taskCount).to.equal(0);

      const notifCount = await db.ScheduledNotification.count({
        where: { type: "Task", subjectId: victim.id },
        transaction,
      });
      expect(notifCount).to.equal(0);
    });

    it("should reject assigning after ended transactional pair", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const mentee = await createTestUser(["Mentee"]);
      await db.Mentorship.create(
        {
          mentorId: mentor.id,
          menteeId: mentee.id,
          transactional: true,
          endsAt: new Date(Date.now() - 1000000000),
        },
        { transaction },
      );

      let caughtMentor: unknown;
      try {
        await createImpl(mentor, mentee.id, "Expired Task", transaction);
      } catch (error) {
        caughtMentor = error;
      }
      expect(caughtMentor).to.be.instanceOf(TRPCError);
      expect((caughtMentor as TRPCError).code).to.equal("FORBIDDEN");

      let caughtMentee: unknown;
      try {
        await createImpl(mentee, mentor.id, "Expired Task", transaction);
      } catch (error) {
        caughtMentee = error;
      }
      expect(caughtMentee).to.be.instanceOf(TRPCError);
      expect((caughtMentee as TRPCError).code).to.equal("FORBIDDEN");
    });

    it("should fail when markdown is empty", async () => {
      let caught: unknown;
      try {
        await createImpl(testUser, testUser.id, "   ", transaction);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("BAD_REQUEST");
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

    it("should fail on unauthorized updates without leaking UUID", async () => {
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

      let caught: unknown;
      try {
        await updateImpl(
          testUser,
          task.id,
          otherUser.id,
          "Updated Task",
          transaction,
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("FORBIDDEN");
      expect((caught as TRPCError).message).to.not.include(otherUser.id);
    });

    it("should return NOT_FOUND for non-existent task id", async () => {
      let caught: unknown;
      try {
        await updateImpl(
          testUser,
          999999999,
          testUser.id,
          "Updated Task",
          transaction,
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("NOT_FOUND");
    });

    it("should allow assignee to edit text without reassigning", async () => {
      const admin = await createTestUser(["MentorshipAdmin"]);
      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: admin.id,
          markdown: "Admin Task",
          done: false,
        },
        { transaction },
      );

      await updateImpl(
        testUser,
        task.id,
        testUser.id,
        "Updated Admin Task",
        transaction,
      );

      const updated = await db.Task.findByPk(task.id, { transaction });
      expect(updated?.markdown).to.equal("Updated Admin Task");
      expect(updated?.assigneeId).to.equal(testUser.id);
    });

    it("should block assignee from reassigning another's task", async () => {
      const admin = await createTestUser(["MentorshipAdmin"]);
      const mentee = await createTestUser(["Mentee"]);
      await db.Mentorship.create(
        {
          mentorId: testUser.id,
          menteeId: mentee.id,
          transactional: false,
          endsAt: null,
        },
        { transaction },
      );

      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: admin.id,
          markdown: "Admin Task",
          done: false,
        },
        { transaction },
      );

      let caught: unknown;
      try {
        await updateImpl(
          testUser,
          task.id,
          mentee.id,
          "Reassigned Task",
          transaction,
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("FORBIDDEN");

      const unchanged = await db.Task.findByPk(task.id, { transaction });
      expect(unchanged?.assigneeId).to.equal(testUser.id);
    });

    it("should allow creator to reassign to authorized assignee", async () => {
      const mentee = await createTestUser(["Mentee"]);
      await db.Mentorship.create(
        {
          mentorId: testUser.id,
          menteeId: mentee.id,
          transactional: false,
          endsAt: null,
        },
        { transaction },
      );

      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "Self Task",
          done: false,
        },
        { transaction },
      );

      await updateImpl(
        testUser,
        task.id,
        mentee.id,
        "Delegated Task",
        transaction,
      );

      const updated = await db.Task.findByPk(task.id, { transaction });
      expect(updated?.assigneeId).to.equal(mentee.id);
      expect(updated?.markdown).to.equal("Delegated Task");
    });

    it("should block creator from reassigning to unrelated user", async () => {
      const victim = await createTestUser(["Mentee"]);
      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          creatorId: testUser.id,
          markdown: "Self Task",
          done: false,
        },
        { transaction },
      );

      let caught: unknown;
      try {
        await updateImpl(
          testUser,
          task.id,
          victim.id,
          "Hijacked Task",
          transaction,
        );
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("FORBIDDEN");

      const unchanged = await db.Task.findByPk(task.id, { transaction });
      expect(unchanged?.assigneeId).to.equal(testUser.id);

      const notifCount = await db.ScheduledNotification.count({
        where: { type: "Task", subjectId: victim.id },
        transaction,
      });
      expect(notifCount).to.equal(0);
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

      let caught: unknown;
      try {
        await updateImpl(testUser, task.id, testUser.id, "   ", transaction);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("BAD_REQUEST");
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

    it("should fail when lacking permission without leaking UUID", async () => {
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

      let caught: unknown;
      try {
        await updateDoneImpl(testUser, task.id, true, transaction);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("FORBIDDEN");
      expect((caught as TRPCError).message).to.not.include(otherUser.id);
    });

    it("should return NOT_FOUND for non-existent task id", async () => {
      let caught: unknown;
      try {
        await updateDoneImpl(testUser, 999999999, true, transaction);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("NOT_FOUND");
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

      let caught: unknown;
      try {
        await updateDoneImpl(testUser, task.id, true, transaction);
      } catch (error) {
        caught = error;
      }
      expect(caught).to.be.instanceOf(TRPCError);
      expect((caught as TRPCError).code).to.equal("FORBIDDEN");
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

    it("should ignore done tasks", async () => {
      const otherUser = await createTestUser();
      const beforeDate = await getLastTasksUpdatedAtImpl(testUser, transaction);

      await db.Task.create(
        {
          creatorId: otherUser.id,
          assigneeId: testUser.id,
          markdown: "Done Task",
          done: true,
        },
        { transaction },
      );

      const afterDate = await getLastTasksUpdatedAtImpl(testUser, transaction);
      expect(moment(afterDate).toDate().getTime()).to.equal(
        moment(beforeDate).toDate().getTime(),
      );
    });

    it("should ignore tasks created by the user themselves", async () => {
      const beforeDate = await getLastTasksUpdatedAtImpl(testUser, transaction);

      await db.Task.create(
        {
          creatorId: testUser.id,
          assigneeId: testUser.id,
          markdown: "Self-created Task",
          done: false,
        },
        { transaction },
      );

      const afterDate = await getLastTasksUpdatedAtImpl(testUser, transaction);
      expect(moment(afterDate).toDate().getTime()).to.equal(
        moment(beforeDate).toDate().getTime(),
      );
    });

    it("should consider auto tasks (creatorId is null)", async () => {
      const task = await db.Task.create(
        {
          assigneeId: testUser.id,
          autoTaskId: "study-comms",
          done: false,
        },
        { transaction },
      );

      const afterDate = await getLastTasksUpdatedAtImpl(testUser, transaction);
      expect(moment(afterDate).toDate().getTime()).to.equal(
        task.updatedAt.getTime(),
      );
    });
  });
});
