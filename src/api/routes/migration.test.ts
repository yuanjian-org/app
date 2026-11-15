import crypto from "crypto";
import { expect } from "chai";
import sinon from "sinon";
import db from "../database/db";
import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
import { migrateDatabase } from "./migration";

describe("migration.ts", () => {
  let sequelizeSyncStub: sinon.SinonStub;
  let meetingSequelizeSyncStub: sinon.SinonStub;

  beforeEach(() => {
    sequelizeSyncStub = sinon.stub(sequelize, "sync").resolves();
    meetingSequelizeSyncStub = sinon.stub(meetingSequelize, "sync").resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("migrateDatabase", () => {
    it("should migrate MentorBookings and sync dbs", async () => {
      // Simulate pre-migration state where topic and notes were VARCHAR(255).
      await sequelize.query(`
        ALTER TABLE "MentorBookings"
          ALTER COLUMN "topic" TYPE VARCHAR(255),
          ALTER COLUMN "notes" TYPE VARCHAR(255);
      `);

      await migrateDatabase();

      const [columns] = await sequelize.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'MentorBookings'
          AND column_name IN ('topic', 'notes');
      `);
      const typedColumns = columns as Array<{
        column_name: string;
        data_type: string;
      }>;
      expect(typedColumns).to.have.lengthOf(2);
      for (const col of typedColumns) {
        expect(col.data_type).to.equal("text");
      }

      void expect(sequelizeSyncStub.calledOnce).to.be.true;
      void expect(sequelizeSyncStub.calledWith({ alter: { drop: false } })).to
        .be.true;

      void expect(meetingSequelizeSyncStub.calledOnce).to.be.true;
      void expect(
        meetingSequelizeSyncStub.calledWith({ alter: { drop: false } }),
      ).to.be.true;
    });

    it("should migrate ShudongUpvotes into ShudongReactions", async () => {
      const userId = crypto.randomUUID();
      const postId = crypto.randomUUID();
      await db.User.create({
        id: userId,
        email: `migration-shudong-${userId}@test.com`,
        name: "Migration Test User",
        roles: ["Mentor"],
      });
      await db.ShudongPost.create({
        id: postId,
        authorId: userId,
        markdown: "Legacy upvote post",
        isAnonymous: false,
      });

      try {
        await sequelize.query(`
          ALTER TABLE "ShudongPosts"
            ADD COLUMN IF NOT EXISTS "upvoteCount" INTEGER NOT NULL DEFAULT 0;
        `);
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS "ShudongUpvotes" (
            "id" SERIAL PRIMARY KEY,
            "postId" UUID NOT NULL REFERENCES "ShudongPosts" ("id"),
            "userId" UUID NOT NULL REFERENCES "users" ("id"),
            "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await sequelize.query(
          `
            INSERT INTO "ShudongUpvotes" ("postId", "userId")
            VALUES (:postId, :userId);
          `,
          { replacements: { postId, userId } },
        );

        await migrateDatabase();

        const migrated = await db.ShudongReaction.findOne({
          where: { postId, userId, emoji: "👍" },
        });
        void expect(migrated).to.not.be.null;

        const [tableRows] = await sequelize.query(`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_name = 'ShudongUpvotes';
        `);
        expect(tableRows).to.have.lengthOf(0);

        const [colRows] = await sequelize.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'ShudongPosts'
            AND column_name = 'upvoteCount';
        `);
        expect(colRows).to.have.lengthOf(0);
      } finally {
        await sequelize.query(`DROP TABLE IF EXISTS "ShudongUpvotes";`);
        await db.ShudongReaction.destroy({ where: { postId, userId } });
        await db.ShudongPost.destroy({ where: { id: postId } });
        await db.User.destroy({ where: { id: userId } });
      }
    });
  });
});
