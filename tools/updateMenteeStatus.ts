import sequelize from "../src/api/database/sequelize";

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main().then();
async function main() {
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

  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}
