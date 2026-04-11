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

  // Add failedAttempts to IdTokens table.
  await sequelize.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'IdTokens' AND column_name = 'failedAttempts'
      ) THEN
        ALTER TABLE "IdTokens" ADD COLUMN "failedAttempts" INTEGER NOT NULL DEFAULT 0;
      END IF;
    END $$;
  `);
}

async function migrateData() {
  console.log("Migrating DB data...");

  await Promise.resolve();
}
