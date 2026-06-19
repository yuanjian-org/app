import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase()),
});

export async function migrateDatabase() {
  await migrateSchema();
  await sequelize.sync({ alter: { drop: false } });
  await meetingSequelize.sync({ alter: { drop: false } });
  await migrateData();
}

async function migrateSchema() {
  console.log("Migrating DB schema...");

  // NOTE: This runs BEFORE sequelize.sync() which means the enum type might not be updated yet.
  // Sequelize sync alter will update the enum type enum_Users_roles to include the new ones.

  await Promise.resolve();
}

async function migrateData() {
  console.log("Migrating DB data...");

  // Only run the query if Users table exists
  const [results] = await sequelize.query(
    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Users');",
  );
  if ((results as any[])[0].exists) {
    // Replace old roles with new roles
    // Since sequelize sync has run, the enum_Users_roles type should contain both old and new roles.
    await sequelize.query(`
      UPDATE "Users"
      SET "roles" = (
        SELECT array_agg(
          CASE
            WHEN role::text = 'UserManager' THEN 'UserAdmin'
            WHEN role::text = 'GroupManager' THEN 'GroupAdmin'
            WHEN role::text = 'MentorshipManager' THEN 'MentorshipAdmin'
            ELSE role::text
          END
        )::enum_Users_roles[]
        FROM unnest("roles") AS role
      )
      WHERE "roles"::text[] && ARRAY['UserManager', 'GroupManager', 'MentorshipManager'];
    `);
  }

  await Promise.resolve();
}
