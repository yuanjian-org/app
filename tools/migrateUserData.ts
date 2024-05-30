import sequelize from "../src/api/database/sequelize";
import db from "../src/api/database/db";

export async function migrateRoles() {
  console.log("Starting the migration of roles...");

  try {
    await sequelize.query('ALTER TABLE users ADD COLUMN temp_roles VARCHAR[]');
    console.log("Added temporary column for roles.");
  } catch (error) {
    console.error("Error adding temporary column: ", error);
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    const users = await db.User.findAll({
      attributes: ['id', 'roles'],
      transaction
    });

    for (const user of users) {
      const currentRoles = JSON.parse(user.getDataValue('roles') as string);
      await user.update({ temp_roles: currentRoles }, { transaction });
    }
    await transaction.commit();
    console.log("Roles data migration completed successfully.");
  } catch (error) {
    await transaction.rollback();
    console.error("Data migration failed: ", error);
    return;
  }

  try {
    await sequelize.query('ALTER TABLE users DROP COLUMN roles');
    await sequelize.query('ALTER TABLE users RENAME COLUMN temp_roles TO roles');
    console.log("Schema update completed successfully.");
  } catch (error) {
    console.error("Error updating schema: ", error);
  }
}