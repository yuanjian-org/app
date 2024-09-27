import sequelize from "../src/api/database/sequelize";

export default async function updateMenteeStatus() {
  console.log("Updating mentee status...");

  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
        `UPDATE Users SET "menteeStatus" = '面拒' WHERE "menteeStatus" = '面据'`,
        { transaction }
    );

    await sequelize.query(
        `UPDATE Users SET "menteeStatus" = '初拒' WHERE "menteeStatus" = '初据'`,
        { transaction }
    );
  });
}
