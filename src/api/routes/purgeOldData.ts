import { Op, Transaction } from "sequelize";
import db from "../database/db";

export async function purgeOldData(transaction?: Transaction) {
  console.log("Purge old data...");
  const now = Date.now();

  await db.EventLog.destroy({
    where: {
      updatedAt: {
        [Op.lt]: new Date(now - 365 * 86400000), // 1 year
      },
    },
    transaction,
  });

  await db.InterviewFeedbackUpdateAttempt.destroy({
    where: {
      updatedAt: {
        [Op.lt]: new Date(now - 30 * 86400000), // 30 days
      },
    },
    transaction,
  });

  // MeetingHistories table is used to retrieve meeting summaries from Tencent
  // Meeting API. Tencent retains meeting records only for 30 days. Keep the
  // history here a bit longer for debugging purposes.
  await db.MeetingHistory.destroy({
    where: {
      updatedAt: {
        [Op.lt]: new Date(now - 60 * 86400000), // 60 days
      },
    },
    transaction,
  });
}
