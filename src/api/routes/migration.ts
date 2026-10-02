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

  const [results] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name = 'DraftChatMessages'
       OR table_name = 'DraftMessages';
  `);
  const tableNames = (results as any[]).map(
    (r: any) => r.table_name || r.TABLE_NAME,
  );
  if (
    tableNames.includes("DraftChatMessages") &&
    tableNames.includes("DraftMessages")
  ) {
    await sequelize.query(`
      INSERT INTO "DraftMessages" ("chatRoomId", "chatMessageId", "authorId", "markdown", "createdAt", "updatedAt")
      SELECT "roomId", "messageId", "authorId", "markdown", "createdAt", "updatedAt"
      FROM "DraftChatMessages"
      ON CONFLICT DO NOTHING;
    `);
    await sequelize.query(`DROP TABLE IF EXISTS "DraftChatMessages";`);
  }
}
