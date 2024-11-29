import { adapter } from "../src/pages/api/auth/[...nextauth]";
import sequelize from "../src/api/database/sequelize";
import { migrateDatabase } from "../src/api/routes/migration";

async function sync() {
  console.log("Syncing database... It may take a while. Grab a coffee.");

  await dropParanoid();

  // Register the next-auth adapter so sequelize.sync() will create tables for
  // next-auth.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = adapter;

  await migrateDatabase();

  // This make sure the process doesn't hang waiting for connection closure.
  await sequelize.close();
}

void sync().then();

async function dropParanoid() {
  for (const table of ["users", "groups"]) {
    await sequelize.query(`
      DO $$ 
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = '${table}' AND column_name = 'deletedAt'
      ) THEN
        DELETE FROM "${table}" WHERE "deletedAt" IS NOT NULL;
        ALTER TABLE "${table}" DROP COLUMN "deletedAt";
      END IF;
      END $$;
    `);
  }
}
