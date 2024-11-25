import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  console.log("Migrating DB schema...");

  await sequelize.sync({ alter: { drop: false } });

  console.log("Migrating DB data...");

  console.log("Clean up old DB data...");
  await cleanupFeedbackAttemptLogs();
}

async function cleanupFeedbackAttemptLogs() {
  console.log("Deleting old feedback attempt logs...");
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}
