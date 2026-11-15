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

  await migrateShudongUpvotes();
}

/**
 * Copies legacy ShudongUpvotes rows into ShudongReactions with emoji '👍',
 * then drops the obsolete ShudongUpvotes table and ShudongPosts.upvoteCount
 * column once ShudongReactions exists.
 */
async function migrateShudongUpvotes() {
  const [results] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name IN ('ShudongUpvotes', 'ShudongReactions');
  `);
  const tables = (
    results as Array<{ table_name?: string; TABLE_NAME?: string }>
  ).map((r) => r.table_name || r.TABLE_NAME);

  if (!tables.includes("ShudongReactions")) {
    return;
  }

  if (tables.includes("ShudongUpvotes")) {
    await sequelize.query(`
      INSERT INTO "ShudongReactions" (
        "postId", "userId", "emoji", "createdAt", "updatedAt"
      )
      SELECT "postId", "userId", '👍', "createdAt", "updatedAt"
      FROM "ShudongUpvotes"
      ON CONFLICT ("postId", "userId", "emoji") DO NOTHING;
    `);
    await sequelize.query(`DROP TABLE IF EXISTS "ShudongUpvotes";`);
  }

  await sequelize.query(`
    ALTER TABLE IF EXISTS "ShudongPosts"
      DROP COLUMN IF EXISTS "upvoteCount";
  `);
}
