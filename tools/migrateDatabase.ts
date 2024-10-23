import { adapter } from "../src/pages/api/auth/[...nextauth]";
import sequelize from "../src/api/database/sequelize";
import { migrateDatabase } from "../src/api/routes/migration";

async function sync() {
  console.log("Syncing database... It may take a while. Grab a coffee.");

  // Register the next-auth adapter so sequelize.sync() will create tables for
  // next-auth.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = adapter;

  await migrateDatabase();

  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}

void sync().then();
