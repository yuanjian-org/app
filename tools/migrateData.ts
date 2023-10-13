import Role from "../src/shared/Role";
import db from "../src/api/database/db";
import sequelize from "../src/api/database/sequelize";

export default async function migrateData() {
  console.log("Migrating...");

  await sequelize.query('alter table "Partnerships" drop column if exists "coachId"');
  await sequelize.query('alter table "groups" drop column if exists "coachingPartnershipId"');
  await sequelize.query('alter table "ChatMessages" drop column if exists "threadId"');
  await sequelize.query('alter table "Partnerships" drop column if exists "internalChatThreadId"');
  await sequelize.query('drop table if exists "ChatThreads"');

  console.log("Migrating role names...");

  await sequelize.transaction(async transaction => {
    const users = await db.User.findAll({
      attributes: ["id", "roles"],
    });

    for (const u of users) {
      const roles: Role[] = u.roles.map(r => (
        r === "PrivilegedRoleManager" ? "RoleManager" :
        r === "PartnershipAssessor" ? "MentorshipAssessor" :
        r === "PartnershipManager" ? "MentorshipManager" :
        r
      ));
      await u.update({ roles }, { transaction });
    }
  });
}
