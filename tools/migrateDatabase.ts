import sequelize from "../src/api/database/sequelize";
import { migrateDatabase } from "../src/api/routes/migration";

async function sync() {
  await migrateDatabase();
  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}

void sync().then();
