import sequelize from "../src/api/database/sequelize";
import { migrateDatabase } from "../src/api/routes/migration";
import { adapter } from "../src/pages/api/auth/[...nextauth]";

async function sync() {
  // Register the next-auth adapter so sequelize.sync() will create tables for
  // next-auth.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = adapter;

  await migrateDatabase();

  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}

void sync().then();
