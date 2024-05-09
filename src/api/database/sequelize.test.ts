import sequelize from "./sequelize";

/**
 * This function runs after all tests complete to make sure the process doesn't hang waiting for connection closure.
 */
after(async () => {
  await sequelize.close();
});
