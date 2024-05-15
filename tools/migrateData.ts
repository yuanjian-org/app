import Role from "../src/shared/Role";
import db from "../src/api/database/db";
import sequelize from "../src/api/database/sequelize";

export default async function migrateData() {
  console.log("Migrating...");

  await sequelize.query('ALTER TABLE "ChatRooms" ' + 
  'DROP COLUMN IF EXISTS "mentorshipId"');

  await sequelize.transaction(async transaction => {
    console.log("Migrating role names...");
    const users = await db.User.findAll({
      attributes: ["id", "roles"],
      transaction
    });

    for (const u of users) {
      const roles: Role[] = u.roles.map(r => (
        // r === "MentorshipManager" ? "MenteeManager" :
        r
      ));
      await u.update({ roles }, { transaction });
    }
  });
}
