import { adapter } from "../src/pages/api/auth/[...nextauth]";
import sequelizeInstance from "../src/api/database/sequelizeInstance";
import migrateData from "./migrateData";

async function sync() {
  console.log("Syncing database... It may take a while. Grab a coffee.");

  // Register the next-auth adapter so sequelize.sync() will create tables for next-auth.
  const _ = adapter;

  await sequelizeInstance.sync({ alter: { drop: false } });
  await migrateData();
  // This make sure the process doesn't hang waiting for connection closure.
  await sequelizeInstance.close();
}

sync().then();
