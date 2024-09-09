import Role from "../src/shared/Role";
import db from "../src/api/database/db";
import sequelize from "../src/api/database/sequelize";

export default async function migrateData() {
  console.log("Migrating...");

  await sequelize.query('ALTER TABLE "ChatRooms" ' + 
  'DROP COLUMN IF EXISTS "mentorshipId"');

  await sequelize.query('ALTER TABLE "groups" ' + 
  'DROP COLUMN IF EXISTS "roles"');

  await sequelize.transaction(async transaction => {
    console.log("Migrating role names...");
    const users = await db.User.findAll({
      attributes: ["id", "roles"],
      transaction
    });

    for (const u of users) {
      if (!u.roles.includes("MenteeManager")) continue;
      const roles: Role[] = [...u.roles.filter(r => r !== "MenteeManager"),
        "MentorshipManager"];
      await u.update({ roles }, { transaction });
    }
  });
}
