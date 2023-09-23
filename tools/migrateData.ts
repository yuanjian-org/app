import sequelizeInstance from "../src/api/database/sequelizeInstance";

export default async function migrateData() {
  console.log("Migrating...");

  await sequelizeInstance.query('alter table "Partnerships" drop column if exists "coachId"');
  await sequelizeInstance.query('alter table "groups" drop column if exists "coachingPartnershipId"');
}
