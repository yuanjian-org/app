import { adapter } from "../src/pages/api/auth/[...nextauth]";
import sequelize from "../src/api/database/sequelize";
import migrateData from "./migrateData";

async function sync() {
  console.log("Syncing database... It may take a while. Grab a coffee.");

  // Register the next-auth adapter so sequelize.sync() will create tables for next-auth.
  const _ = adapter;

  await migrateData(); // migrate any changes before syncing so no duplicated tables would be created
  await sequelize.sync({ alter: { drop: false } });
  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}

sync().then();
