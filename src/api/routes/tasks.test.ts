import { expect } from "chai";
import { createAutoTask } from "./tasks";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";

describe("createAutoTask", () => {
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
