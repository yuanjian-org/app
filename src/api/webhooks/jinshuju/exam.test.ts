import { expect } from "chai";
import db from "../../database/db";
import sequelize from "../../database/sequelize";
import { AutoTaskId } from "../../../shared/Task";
import submitExam from "./exam";

describe("exam webhook", () => {
  let userId: string;
  let taskId: number;

  beforeEach(async () => {
    // Create a test user
    await sequelize.transaction(async (transaction) => {
      await db.User.create(
        {
          email: "test2@example.com",
          name: "Test User",
          roles: [],
        },
        { transaction },
      );
    });

    const user = await db.User.findOne({
      where: { email: "test2@example.com" },
    });
    userId = user!.id;

    // Create a test task for the user
    const task = await db.Task.create({
      assigneeId: userId,
      autoTaskId: "study-comms" as AutoTaskId,
      done: false,
    });
    taskId = task.id;
  });

  afterEach(async () => {
    // Clean up test data
    await sequelize.transaction(async (transaction) => {
      await db.Task.destroy({
        where: { id: taskId },
        transaction,
        force: true,
      });
      await db.User.destroy({
        where: { id: userId },
        transaction,
        force: true,
      });
    });
  });

  describe("successful exam submission", () => {
    it("should update user state and mark comms exam task as done", async () => {
      const formEntry = {
        x_field_1: "tester," + userId,
        exam_score: 85,
      };

      await submitExam(formEntry, "commsExam", 80);

      // Verify user state was updated
      const updatedUser = await db.User.findByPk(userId);
      expect(updatedUser?.state?.commsExam).to.be.a("string");
      void expect(new Date(updatedUser!.state!.commsExam!)).to.be.instanceOf(
        Date,
      );

      // Verify task was marked as done
      const updatedTask = await db.Task.findByPk(taskId);
      void expect(updatedTask?.done).to.be.true;
    });
  });
});
