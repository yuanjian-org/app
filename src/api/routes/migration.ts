import sequelize from "../database/sequelize";
import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import db from "../database/db";
import { Op } from "sequelize";

export default router({
  // TODO: Should we require an Admin auth token separate from integration
  // token?
  migrateDatabase: procedure
    .use(authIntegration())
    .mutation(async () => await migrateDatabase())
});

export async function migrateDatabase() {
  await migrateSchema();
  await sequelize.sync({ alter: { drop: false } });
  await migrateData();
  await purgeOldData();
}

async function purgeOldData() {
  console.log("Purge old data...");
  await sequelize.query(`
    DELETE FROM "EventLogs"
    WHERE "updatedAt" < NOW() - INTERVAL '1 year';
  `);

  await sequelize.query(`
    DELETE FROM "InterviewFeedbackUpdateAttempts"
    WHERE "updatedAt" < NOW() - INTERVAL '30 days';
  `);

  // MeetingHistories table is used to retrieve meeting summaries from Tencent
  // Meeting API. Tencent retains meeting records only for 30 days. Keep the
  // history here a bit longer for debugging purposes.
  await sequelize.query(`
    DELETE FROM "MeetingHistories"
    WHERE "updatedAt" < NOW() - INTERVAL '60 days';
  `);
}

async function migrateSchema() {
  console.log("Migrating DB schema...");

  await sequelize.query(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Summaries'
        AND column_name = 'initialLength'
      ) THEN
        ALTER TABLE "Summaries"
        ADD COLUMN "initialLength" INTEGER DEFAULT 0;
        ALTER TABLE "Summaries"
        ADD COLUMN "deletedLength" INTEGER DEFAULT 0;
      END IF;
    END $$;
  `);

  await Promise.resolve();
}

async function migrateData() {
  console.log("Migrating DB data...");

  await sequelize.transaction(async (transaction) => {
    const summaries = await db.Summary.findAll({ 
      where: {
        initialLength: { [Op.is]: null },
      },
      transaction
     });
    for (const s of summaries) {
      s.initialLength = s.markdown.length;
      s.deletedLength = 0;
      await s.save({ transaction });
    }
  });

  await Promise.resolve();
}
