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

  await Promise.resolve();
}

async function migrateData() {
  console.log("Migrating DB data...");

  await sequelize.query(
    `UPDATE "Projects" SET visibility = '未列出' WHERE visibility = '保密'`,
  );

  await Promise.resolve();
}
