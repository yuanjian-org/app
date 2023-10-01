import sequelize from "../src/api/database/sequelize";

export default async function migrateData() {
  console.log("Migrating...");

  await sequelize.query('alter table "Partnerships" drop column if exists "coachId"');
  await sequelize.query('alter table "groups" drop column if exists "coachingPartnershipId"');
  await sequelize.query('alter table "ChatMessages" drop column if exists "threadId"');
  await sequelize.query('alter table "Partnerships" drop column if exists "internalChatThreadId"');
  await sequelize.query('drop table if exists "ChatThreads"');
}
