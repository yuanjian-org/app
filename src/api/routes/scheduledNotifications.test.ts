import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { scheduleNotification } from "./scheduledNotifications";
import { v4 as uuidv4 } from "uuid";

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
});
