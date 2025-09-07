import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase()),
});

export async function migrateDatabase() {
  await migrateSchema();
  await sequelize.sync({ alter: { drop: false } });
  await migrateData();
  await purgeOldData();
}

async function purgeOldData() {
  console.log("Purge old data...");
  await sequelize.query(`
    DELETE FROM "EventLogs"
    WHERE "updatedAt" < NOW() - INTERVAL '1 year';
  `);

  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "updatedAt" < NOW() - INTERVAL '30 days';
  `);

  // MeetingHistories table is used to retrieve meeting summaries from Tencent
  // Meeting API. Tencent retains meeting records only for 30 days. Keep the
  // history here a bit longer for debugging purposes.
  await sequelize.query(`
    DELETE FROM "MeetingHistories"
    WHERE "updatedAt" < NOW() - INTERVAL '60 days';
  `);
}

async function migrateSchema() {
  console.log("Migrating DB schema...");
  // Make email column nullable in users table
  await sequelize.query(`
    ALTER TABLE "users" 
    ALTER COLUMN "email" DROP NOT NULL;
  `);
  // Set email to null for users with fake emails ending with "@f.ml"
  await sequelize.query(`
    UPDATE "users" 
    SET "email" = NULL 
    WHERE "email" LIKE '%@f.ml';
  `);
  await sequelize.query(`
    DO $$
    BEGIN
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'image'
        ) THEN
            ALTER TABLE "users" 
            DROP COLUMN "image";
        END IF;
    END $$;
  `);
  await Promise.resolve();
}

async function migrateData() {
  console.log("Migrating DB data...");

  await Promise.resolve();
}
