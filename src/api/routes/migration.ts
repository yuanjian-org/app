import sequelize from "../database/sequelize";
import db from "../database/db";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import { Op } from 'sequelize';

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

  await sequelize.sync({ alter: { drop: false } });

  console.log("Migrating DB data...");

  await migrateSexAndCity();

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

/**
 * TODO: when removing this code, also delete sex and city columns from db.
 */
async function migrateSexAndCity() {
  console.log("Migrating sex and city...");
  await sequelize.transaction(async transaction => {
    const users = await db.User.findAll({
      where: {
        [Op.or]: [
          { sex: { [Op.ne]: null } },
          { city: { [Op.ne]: null } },
        ]
      },
      attributes: ["id", "sex", "city", "profile"],
      transaction
    });

    await Promise.all(users.map(async u => {
      await u.update({
        sex: null,
        city: null,
        profile: {
          ...u.profile,
          ...u.sex ? { '性别': u.sex } : {},
          ...u.city ? { '现居住地': u.city } : {},
        }
      });
    }, { transaction }));

    console.log(`${users.length} users are migrated.`);
  });
}
