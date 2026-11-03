import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
import db from "../database/db";
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

  // Enforce authorId as non-null for existing ShudongPosts before alter table.
  // authorId is needed to avoid sending notifications to the poster of
  // anonymous posts.
  const [tableResults] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name = 'ShudongPosts';
  `);
  const tables = (tableResults as any[]).map(
    (r: any) => r.table_name || r.TABLE_NAME,
  );
  if (tables.includes("ShudongPosts") && tables.includes("users")) {
    await sequelize.query(`
      UPDATE "ShudongPosts"
      SET "authorId" = (SELECT "id" FROM "Users" ORDER BY "createdAt" ASC LIMIT 1)
      WHERE "authorId" IS NULL AND EXISTS (SELECT 1 FROM "Users");
    `);
    await sequelize.query(`
      ALTER TABLE "ShudongPosts"
      ALTER COLUMN "authorId" SET NOT NULL;
    `);
  }
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

  await migrateShudongResponseCounts();
}

/**
 * Recalculates responseCount for existing Shudong posts so that each post's
 * responseCount includes all nested visible descendant responses.
 */
async function migrateShudongResponseCounts() {
  const [tableResults] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name = 'ShudongPosts';
  `);
  const tables = (tableResults as any[]).map(
    (r: any) => r.table_name || r.TABLE_NAME,
  );
  if (!tables.includes("ShudongPosts")) {
    return;
  }

  const posts = await db.ShudongPost.findAll({
    attributes: ["id", "parentId", "deletedAt", "responseCount"],
  });

  if (posts.length === 0) {
    return;
  }

  // Map of postId -> post for O(1) lookups
  const postMap = new Map(posts.map((p) => [p.id, p]));

  // Build map of parentId -> array of child posts
  const childrenMap = new Map<string, typeof posts>();
  for (const p of posts) {
    if (p.parentId) {
      const list = childrenMap.get(p.parentId) || [];
      list.push(p);
      childrenMap.set(p.parentId, list);
    }
  }

  // Map to store computed responseCount for each post
  const computedResponseCountMap = new Map<string, number>();

  function getPostStats(
    postId: string,
    visited = new Set<string>(),
  ): { totalVisibleDescendants: number; isVisible: boolean } {
    if (visited.has(postId)) {
      return { totalVisibleDescendants: 0, isVisible: false };
    }
    visited.add(postId);

    const post = postMap.get(postId);
    if (!post) {
      return { totalVisibleDescendants: 0, isVisible: false };
    }

    let totalVisibleDescendants = 0;
    const children = childrenMap.get(postId) || [];

    for (const child of children) {
      const childStats = getPostStats(child.id, visited);
      if (childStats.isVisible) {
        totalVisibleDescendants += 1 + childStats.totalVisibleDescendants;
      }
    }

    computedResponseCountMap.set(postId, totalVisibleDescendants);
    const isVisible = post.deletedAt === null || totalVisibleDescendants > 0;
    return { totalVisibleDescendants, isVisible };
  }

  // Compute stats starting from root posts
  const rootPosts = posts.filter((p) => p.parentId === null);
  for (const root of rootPosts) {
    getPostStats(root.id);
  }

  // Compute stats for any unvisited/orphan posts
  for (const post of posts) {
    if (!computedResponseCountMap.has(post.id)) {
      getPostStats(post.id);
    }
  }

  // Update responseCount in database if different
  for (const post of posts) {
    const computed = computedResponseCountMap.get(post.id) ?? 0;
    if (post.responseCount !== computed) {
      await db.ShudongPost.update(
        { responseCount: computed },
        { where: { id: post.id } },
      );
    }
  }
}
