import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import db from "../database/db";
import { Op } from "sequelize";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  console.log("Migrating DB schema...");

  migrateSchema();
  await sequelize.sync({ alter: { drop: false } });
  await migrateData();
  await cleanupLogs();
}

async function cleanupLogs() {
  console.log("Clean up old logs...");
  await sequelize.query(`
    DELETE FROM "EventLogs"
    WHERE "createdAt" < NOW() - INTERVAL '1 year';
  `);
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}

function migrateSchema() {
  console.log("Migrating DB schema...");
}

async function migrateData() {
  console.log("Migrating DB data...");

  await Promise.all((await db.User.findAll({
    where: {
      menteeInterviewerTestLastPassedAt: {
        [Op.ne]: null,
      },
    },
    attributes: ["id", "menteeInterviewerTestLastPassedAt", "state"],
  })).map(async u => {
    await u.update({
      menteeInterviewerTestLastPassedAt: null,
      state: {
        ...u.state,
        menteeInterviewerExam: u.menteeInterviewerTestLastPassedAt,
      },
    });
  }));

  // A no-op promise for when this function has no actual work to do to suppress
  // build error.
  await Promise.resolve();
}
