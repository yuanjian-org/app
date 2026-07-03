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

  await Promise.resolve();
}

async function migrateData() {
  console.log("Migrating DB data...");

  await sequelize.query(`
    UPDATE "users"
    SET "roles" = (
      SELECT array_agg(
        CASE
          WHEN role::text = 'UserManager' THEN 'UserAdmin'
          WHEN role::text = 'GroupManager' THEN 'GroupAdmin'
          WHEN role::text = 'MentorshipManager' THEN 'MentorshipAdmin'
          ELSE role::text
        END
      )
      FROM unnest("roles") AS role
    )
    WHERE "roles"::text[] && ARRAY['UserManager', 'GroupManager', 'MentorshipManager'];
  `);

  await sequelize.query(`
    UPDATE "ProjectApplications"
    SET "status" = '已批准'
    WHERE "status" = '已通过';
  `);

  await Promise.resolve();
}
