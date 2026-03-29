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
}

async function migrateSchema() {
  console.log("Migrating DB schema...");

  // Rename Transcript primary key column from transcriptId to id
  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Transcripts' AND column_name='transcriptId') THEN
        ALTER TABLE "Transcripts" RENAME COLUMN "transcriptId" TO "id";
      END IF;
    END $$
  `);

  // Next-auth accounts: OAuth access tokens (e.g. JWE) exceed varchar(255).
  await sequelize.query(`
    DO $$
    BEGIN
      IF to_regclass('public.accounts') IS NOT NULL THEN
        ALTER TABLE public.accounts
          ALTER COLUMN access_token TYPE TEXT,
          ALTER COLUMN refresh_token TYPE TEXT;
      END IF;
    END $$
  `);
}

async function migrateData() {
  console.log("Migrating DB data...");

  // Trim whitespace of all ChatMessages.markdown in a single SQL statement.
  await sequelize.query(`
    UPDATE "ChatMessages"
    SET "markdown" = TRIM(BOTH FROM "markdown")
    WHERE "markdown" IS NOT NULL AND "markdown" != TRIM(BOTH FROM "markdown")
  `);

  await Promise.resolve();
}
