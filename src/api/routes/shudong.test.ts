import { expect } from "chai";
import crypto from "crypto";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import User from "../../shared/User";
import {
  createPostImpl,
  getQuestionImpl,
  getResponsesImpl,
  listQuestionsImpl,
  updatePostImpl,
  deletePostImpl,
  toggleUpvoteImpl,
  saveDraftImpl,
  getDraftImpl,
} from "./shudong";
import { features } from "../../shared/Features";

describe("shudong backend routes", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction?.rollback();
  });

  async function createTestUser(
    roles: any[] = [],
    menteeStatus: string | null = null,
  ) {
    const user = await db.User.create(
      {
        email: `shudong-user-${Date.now()}-${crypto.randomUUID()}@test.com`,
        name: "Shudong Test User",
        roles,
        menteeStatus,
      },
      { transaction },
    );
    return {
      id: user.id,
      name: user.name,
      url: null,
      roles: user.roles,
      email: user.email,
      phone: user.phone,
      wechat: user.wechat,
      menteeStatus: user.menteeStatus,
      pointOfContact: null,
      pointOfContactNote: null,
    } as User;
  }

  describe("permissions and access", () => {
    it("should allow mentor, valid mentee, or admin to access shudong", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const mentee = await createTestUser(["Mentee"], "现届学子");
      const admin = await createTestUser(["ShudongAdmin"]);

      const post = await createPostImpl(
        mentor,
        { markdown: "Mentor Question" },
        transaction,
      );
      expect(post.markdown).to.equal("Mentor Question");

      const list = await listQuestionsImpl(mentee, {}, transaction);
      expect(list.length).to.be.greaterThan(0);

      const resp = await createPostImpl(
        admin,
        { parentId: post.id, markdown: "Admin Answer" },
        transaction,
      );
      expect(resp.markdown).to.equal("Admin Answer");
    });

    it("should disallow unauthorized users", async () => {
      const unauthorized = await createTestUser(["Mentee"], "初拒");

      try {
        await listQuestionsImpl(unauthorized, {}, transaction);
        expect.fail("Should have thrown permission error");
      } catch (err: any) {
        expect(err.message).to.contain("没有权限访问");
      }
    });
  });

  describe("post creation and anonymity", () => {
    it("should default to anonymous for questions and non-anonymous for answers", async () => {
      const mentor = await createTestUser(["Mentor"]);

      const question = await createPostImpl(
        mentor,
        { markdown: "What is 1+1?" },
        transaction,
      );
      void expect(question.isAnonymous).to.be.true;
      void expect(question.author).to.be.null;

      const answer = await createPostImpl(
        mentor,
        { parentId: question.id, markdown: "It is 2." },
        transaction,
      );
      void expect(answer.isAnonymous).to.be.false;
      void expect(answer.author).to.not.be.null;
      expect(answer.author?.id).to.equal(mentor.id);

      const qDetail = await getQuestionImpl(
        mentor,
        { questionId: question.id },
        transaction,
      );
      expect(qDetail.responses.length).to.equal(1);

      const resps = await getResponsesImpl(
        mentor,
        { parentId: question.id },
        transaction,
      );
      expect(resps.length).to.equal(1);
    });

    it("should anonymize deleted response with child responses and preserve tree", async () => {
      const mentor = await createTestUser(["Mentor"]);

      const question = await createPostImpl(
        mentor,
        { markdown: "Tree question" },
        transaction,
      );

      const answer = await createPostImpl(
        mentor,
        { parentId: question.id, markdown: "Answer 1", isAnonymous: false },
        transaction,
      );

      const reply = await createPostImpl(
        mentor,
        { parentId: answer.id, markdown: "Reply to Answer 1" },
        transaction,
      );

      // Delete the answer (which has a child reply)
      await deletePostImpl(mentor, { postId: answer.id }, transaction);

      const qDetail = await getQuestionImpl(
        mentor,
        { questionId: question.id },
        transaction,
      );
      expect(qDetail.responses.length).to.equal(1);
      const deletedAns = qDetail.responses[0];
      void expect(deletedAns.isDeleted).to.be.true;
      void expect(deletedAns.author).to.be.null;

      const childResps = await getResponsesImpl(
        mentor,
        { parentId: answer.id },
        transaction,
      );
      expect(childResps.length).to.equal(1);
      expect(childResps[0].id).to.equal(reply.id);
    });

    it("should respect anonymity settings and feature flag for recording authorId", async () => {
      const mentor = await createTestUser(["Mentor"]);

      // Flag disabled: authorId should be null in DB for anonymous post
      features.shudongRecordAnonymousUserId = false;
      const q1 = await createPostImpl(
        mentor,
        { markdown: "Anon q1", isAnonymous: true },
        transaction,
      );
      const dbPost1 = await db.ShudongPost.findByPk(q1.id, { transaction });
      void expect(dbPost1?.authorId).to.be.null;

      // Flag enabled: authorId recorded in DB, but returned author is null
      features.shudongRecordAnonymousUserId = true;
      const q2 = await createPostImpl(
        mentor,
        { markdown: "Anon q2", isAnonymous: true },
        transaction,
      );
      const dbPost2 = await db.ShudongPost.findByPk(q2.id, { transaction });
      expect(dbPost2?.authorId).to.equal(mentor.id);
      void expect(q2.author).to.be.null;

      // Reset flag
      features.shudongRecordAnonymousUserId = undefined;
    });
  });

  describe("editing, soft deleting, and upvoting", () => {
    it("should allow editing and soft deleting by post author or admin", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const otherUser = await createTestUser(["Mentor"]);
      const admin = await createTestUser(["ShudongAdmin"]);

      const q = await createPostImpl(
        mentor,
        { markdown: "Original text", isAnonymous: false },
        transaction,
      );

      // Other user edit attempt should fail
      try {
        await updatePostImpl(
          otherUser,
          { postId: q.id, markdown: "Hacked" },
          transaction,
        );
        expect.fail("Should have failed");
      } catch (err: any) {
        expect(err.message).to.contain("没有权限访问");
      }

      // Author update
      const updated = await updatePostImpl(
        mentor,
        { postId: q.id, markdown: "Updated text" },
        transaction,
      );
      expect(updated.markdown).to.equal("Updated text");
      void expect(updated.isEdited).to.be.true;

      // Admin delete
      await deletePostImpl(admin, { postId: q.id }, transaction);
      const dbPost = await db.ShudongPost.findByPk(q.id, { transaction });
      void expect(dbPost?.isDeleted).to.be.true;
    });

    it("should toggle upvotes correctly", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const q = await createPostImpl(
        mentor,
        { markdown: "Upvote question" },
        transaction,
      );

      // Upvote
      const up1 = await toggleUpvoteImpl(mentor, { postId: q.id }, transaction);
      void expect(up1.userHasUpvoted).to.be.true;
      expect(up1.upvoteCount).to.equal(1);

      // Cancel upvote
      const up2 = await toggleUpvoteImpl(mentor, { postId: q.id }, transaction);
      void expect(up2.userHasUpvoted).to.be.false;
      expect(up2.upvoteCount).to.equal(0);
    });
  });

  describe("draft message management", () => {
    it("should save and retrieve drafts for Shudong posts", async () => {
      const mentor = await createTestUser(["Mentor"]);

      await saveDraftImpl(
        mentor,
        { shudongParentId: "root", markdown: "Draft question" },
        transaction,
      );

      const d1 = await getDraftImpl(
        mentor,
        { shudongParentId: "root" },
        transaction,
      );
      expect(d1).to.equal("Draft question");

      // Creating post should clear the draft
      await createPostImpl(mentor, { markdown: "Final post" }, transaction);

      const d2 = await getDraftImpl(
        mentor,
        { shudongParentId: "root" },
        transaction,
      );
      void expect(d2).to.be.null;
    });
  });
});
