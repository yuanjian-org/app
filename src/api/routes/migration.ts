import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  console.log("Migrating DB schema...");

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'mentorProfile'
      ) THEN
        ALTER TABLE users RENAME COLUMN "mentorProfile" TO "profile";
      END IF;
    END;
    $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'mentorApplication'
      ) THEN
        ALTER TABLE users RENAME COLUMN "mentorApplication"
        TO "volunteerApplication";
      END IF;
    END;
    $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'sex'
      ) THEN
        ALTER TABLE users DROP COLUMN "sex";
      END IF;
    END;
    $$;
  `);

  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'city'
      ) THEN
        ALTER TABLE users DROP COLUMN "city";
      END IF;
    END;
    $$;
  `);

  await sequelize.sync({ alter: { drop: false } });

  console.log("Migrating DB data...");

  console.log("Clean up old DB data...");
  await cleanupFeedbackAttemptLogs();
}

async function cleanupFeedbackAttemptLogs() {
  console.log("Deleting old feedback attempt logs...");
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}
