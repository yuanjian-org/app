import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
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
  await meetingSequelize.sync({ alter: { drop: false } });
  await migrateData();
}

async function migrateSchema() {
  console.log("Migrating DB schema...");

  // Change MentorBookings topic and notes columns from VARCHAR(255) to TEXT to
  // support values longer than 255 characters.
  await sequelize.query(`
    ALTER TABLE IF EXISTS "MentorBookings"
      ALTER COLUMN "topic" TYPE TEXT,
      ALTER COLUMN "notes" TYPE TEXT;
  `);
}

async function migrateData() {
  console.log("Migrating DB data...");

  await Promise.resolve();
}
