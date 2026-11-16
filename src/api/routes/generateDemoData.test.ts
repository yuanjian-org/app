import { expect } from "chai";
import { Op } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import User from "../../shared/User";
import { generateDemoData } from "./generateDemoData";
import { getQuestionImpl, listQuestionsImpl } from "./shudong";
import { shudongSeeds } from "./shudongSeeds";

describe("generateDemoData", () => {
  it("should successfully run and create records in the database", async () => {
    let errorCaught: Error | null = null;

    try {
      await sequelize.transaction(async (transaction) => {
        // Clear pre-existing Shudong posts in the local DB so generateShudong
        // does not skip seeding during this test.
        await db.DraftMessage.destroy({
          where: { shudongPostId: { [Op.ne]: null } },
          transaction,
        });
        await db.ShudongReaction.destroy({ where: {}, transaction });
        await db.ShudongSubscription.destroy({ where: {}, transaction });
        await db.ShudongPost.update(
          { parentId: null },
          { where: {}, transaction },
        );
        await db.ShudongPost.destroy({ where: {}, transaction });

        await generateDemoData(transaction);

        const usersCount = await db.User.count({ transaction });
        expect(usersCount).to.be.greaterThan(0);

        const groupsCount = await db.Group.count({ transaction });
        expect(groupsCount).to.be.greaterThan(0);

        const mentorshipsCount = await db.Mentorship.count({ transaction });
        expect(mentorshipsCount).to.be.greaterThan(0);

        const adminUser = await db.User.findOne({
          where: { email: "admin@de.mo" },
          transaction,
        });
        if (!adminUser) {
          throw new Error("Expected admin@de.mo user to exist");
        }
        expect(adminUser.roles).to.include("ShudongAdmin");

        const expectedPostsCount = shudongSeeds.reduce(
          (sum, thread) => sum + thread.posts.length,
          0,
        );
        const allPosts = await db.ShudongPost.findAll({ transaction });
        expect(allPosts.length).to.equal(expectedPostsCount);
        for (const post of allPosts) {
          expect(post.isAnonymous).to.equal(true);
          expect(post.isAiGenerated).to.equal(true);
        }

        const expectedReactionsCount = shudongSeeds.reduce(
          (sum, thread) =>
            sum +
            thread.posts.reduce(
              (pSum, post) =>
                pSum +
                (post.reactions ?? []).reduce(
                  (rSum, r) => rSum + r.users.length,
                  0,
                ),
              0,
            ),
          0,
        );
        expect(expectedReactionsCount).to.be.greaterThan(0);
        const shudongReactionsCount = await db.ShudongReaction.count({
          transaction,
        });
        expect(shudongReactionsCount).to.equal(expectedReactionsCount);

        const rootCount = await db.ShudongPost.count({
          where: { parentId: null },
          transaction,
        });
        expect(rootCount).to.equal(shudongSeeds.length);

        const admin = adminUser.toJSON() as User;
        const questions = await listQuestionsImpl(admin, 20, 0, transaction);
        expect(questions.length).to.equal(shudongSeeds.length);
        for (const q of questions) {
          expect(q.isMentorPosted).to.equal(false);
          expect(q.isAiGenerated).to.equal(true);
          expect(q.author).to.equal(null);
        }

        // Thread #1 has a reply from "甲导师", which must carry mentor status,
        // and both posts carry seed emoji reactions.
        const thread1RootMarkdown = shudongSeeds[0].posts[0].markdown.trim();
        const thread1 = questions.find(
          (q) => q.markdown === thread1RootMarkdown,
        );
        if (!thread1) {
          throw new Error("Expected Thread #1 root question to be listed");
        }
        expect(
          thread1.reactions.map((r) => ({ emoji: r.emoji, count: r.count })),
        ).to.deep.equal([
          { emoji: "🤗", count: 2 },
          { emoji: "😅", count: 1 },
        ]);

        const detail = await getQuestionImpl(admin, thread1.id, transaction);
        expect(detail.responses.length).to.equal(1);
        expect(detail.responses[0].isMentorPosted).to.equal(true);
        expect(detail.responses[0].isAiGenerated).to.equal(true);
        expect(detail.responses[0].author).to.equal(null);
        expect(
          detail.responses[0].reactions.map((r) => ({
            emoji: r.emoji,
            count: r.count,
          })),
        ).to.deep.equal([
          { emoji: "🙏", count: 1 },
          { emoji: "💡", count: 2 },
        ]);

        // Calling generateDemoData again must be idempotent for Shudong posts
        // and reactions.
        await generateDemoData(transaction);
        const postCountAfterRerun = await db.ShudongPost.count({ transaction });
        expect(postCountAfterRerun).to.equal(expectedPostsCount);
        const reactionCountAfterRerun = await db.ShudongReaction.count({
          transaction,
        });
        expect(reactionCountAfterRerun).to.equal(expectedReactionsCount);

        throw new Error("ROLLBACK_FOR_TEST");
      });
    } catch (e: unknown) {
      errorCaught = e instanceof Error ? e : new Error(String(e));
    }

    expect(errorCaught).to.not.equal(null);
    if (errorCaught && errorCaught.message !== "ROLLBACK_FOR_TEST") {
      console.error(errorCaught);
    }
    expect(errorCaught?.message).to.equal("ROLLBACK_FOR_TEST");
  });
});
