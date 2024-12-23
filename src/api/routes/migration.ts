import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import db from "../database/db";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  console.log("Migrating DB schema...");

  migrateSchema();
  await sequelize.sync({ alter: { drop: false } });
  await migrateData();
  await cleanupLogs();
}

async function cleanupLogs() {
  console.log("Clean up old logs...");
  await sequelize.query(`
    DELETE FROM "EventLogs"
    WHERE "createdAt" < NOW() - INTERVAL '1 year';
  `);
  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "createdAt" < NOW() - INTERVAL '30 days';
  `);
}

function migrateSchema() {
  console.log("Migrating DB schema...");
}

async function migrateData() {
  console.log("Migrating DB data...");

  await sequelize.transaction(async transaction => {
    const likes = await db.Like.findAll({
      transaction,
    });

    for (const like of likes) {
      const user = await db.User.findByPk(like.userId, { 
        attributes: ['id', 'likes'],
        transaction,
      });
      await user?.update({
        likes: (user?.likes ?? 0) + like.count,
      }, { transaction });

      for (let i = 0; i < like.count; i++) {
        await db.Kudos.create({
          receiverId: like.userId,
          giverId: like.likerId,
          text: null,
          createdAt: like.updatedAt,
          updatedAt: like.updatedAt,
        }, { transaction });
      }
    }

    await db.Like.destroy({ 
      where: sequelize.literal('1 = 1'),
      transaction
    });
  });
}
