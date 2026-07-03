import db from "../database/db";
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

  const passedApplications = await db.ProjectApplication.findAll({
    where: {
      status: "已通过",
    },
  });

  for (const app of passedApplications) {
    await app.update({ status: "已批准" });
  }

  await Promise.resolve();
}
