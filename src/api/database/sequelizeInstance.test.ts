import sequelizeInstance from "./sequelizeInstance";

/**
 * This function runs after all tests complete to make sure the process doesn't hang waiting for connection closure.
 */
after(async () => {
  await sequelizeInstance.close();
});
