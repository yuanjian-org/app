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
  await migrateChatMessages();

  console.log("Clean up old DB data...");
  await cleanupFeedbackAttemptLogs();
  await cleanupEventLogs();
}

async function cleanupEventLogs() {
  await sequelize.query(`
    DELETE FROM "EventLogs"
    WHERE "createdAt" < NOW() - INTERVAL '1 year';
  `);
}

async function cleanupFeedbackAttemptLogs() {
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}
async function migrateChatMessages() {
  await sequelize.query(`
    UPDATE "ChatMessages"
    SET "markdown" = REPLACE("markdown", '【导师组内部讨论】', '【导师交流】')
    WHERE "markdown" LIKE '%【导师组内部讨论】%';
  `);
}
