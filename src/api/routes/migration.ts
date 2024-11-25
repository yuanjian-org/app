import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import db from "../database/db";
import { Op } from "sequelize";
import { formatUserName, toPinyin } from "../../shared/strings";

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
  await populateUserUrls();

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

async function populateUserUrls() {
  await sequelize.transaction(async transaction => {
    const users = await db.User.findAll({
      where: { roles: { [Op.contains]: ["Volunteer"] } },
      attributes: ["id", "name", "url"],
      transaction,
    });

    const genUrl = async (name: string | null) => {
      const base = name ? toPinyin(formatUserName(name, "friendly")) :
        "anonymous";
    
      let suffix = 1;
      const getNextUrl = () => {
        const ret = base + (suffix == 1 ? "" : `${suffix}`);
        suffix++;
        return ret;
      };

      while (true) {
        const url = getNextUrl();
        if (await db.User.count({ where: { url }, transaction }) === 0) {
          return url;
        }
      }
    };

    // Serialize the process for rate limiting
    for (const u of users) {
      if (u.url) continue;
      const url = await genUrl(u.name);
      console.log(`Migrating URL for "${u.name}" => "${url}"...`);
      await u.update({ url }, { transaction });
    }
  });
}
