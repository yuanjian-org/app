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

  await Promise.resolve();
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
