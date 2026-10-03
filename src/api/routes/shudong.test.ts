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
        null,
        "Mentor Question",
        true,
        transaction,
      );
      expect(post.markdown).to.equal("Mentor Question");

      const list = await listQuestionsImpl(mentee, 20, 0, transaction);
      expect(list.length).to.be.greaterThan(0);

      const resp = await createPostImpl(
        admin,
        post.id,
        "Admin Answer",
        false,
        transaction,
      );
      expect(resp.markdown).to.equal("Admin Answer");
    });

    it("should disallow unauthorized users", async () => {
      const unauthorized = await createTestUser(["Mentee"], "初拒");

      try {
        await listQuestionsImpl(unauthorized, 20, 0, transaction);
        expect.fail("Should have thrown permission error");
      } catch (err: any) {
        expect(err.message).to.contain("没有权限访问");
      }
    });
  });

  describe("listQuestionsImpl and getQuestionImpl soft-delete filtering", () => {
    it("should hide soft-deleted questions with zero responses in listQuestionsImpl and getQuestionImpl", async () => {
      const mentor = await createTestUser(["Mentor"]);

      // Use isAnonymous=false so authorId is recorded in DB,
      // allowing the author to delete the post.
      const qNoResp = await createPostImpl(
        mentor,
        null,
        "Question with no responses",
        false,
        transaction,
      );

      await deletePostImpl(mentor, qNoResp.id, transaction);

      // Should not show in list
      const list = await listQuestionsImpl(mentor, 20, 0, transaction);
      expect(list.map((q) => q.id)).not.to.include(qNoResp.id);

      // Should throw notFound in getQuestionImpl
      try {
        await getQuestionImpl(mentor, qNoResp.id, transaction);
        expect.fail("Should have thrown not found error");
      } catch (err: any) {
        expect(err.message).to.contain("树洞帖子");
      }
    });

    it("should include soft-deleted questions with existing responses in listQuestionsImpl and getQuestionImpl", async () => {
      const mentor = await createTestUser(["Mentor"]);

      // Use isAnonymous=false so authorId is recorded in DB,
      // allowing the author to delete the post.
      const qWithResp = await createPostImpl(
        mentor,
        null,
        "Question with responses",
        false,
        transaction,
      );

      await createPostImpl(
        mentor,
        qWithResp.id,
        "A response to question",
        false,
        transaction,
      );

      await deletePostImpl(mentor, qWithResp.id, transaction);

      // Should show in list as anonymized
      const list = await listQuestionsImpl(mentor, 20, 0, transaction);
      const found = list.find((q) => q.id === qWithResp.id);
      void expect(found).not.to.be.undefined;
      void expect(found?.isDeleted).to.be.true;
      void expect(found?.author).to.be.null;

      // Should be retrievable in getQuestionImpl
      const detail = await getQuestionImpl(mentor, qWithResp.id, transaction);
      void expect(detail.question.isDeleted).to.be.true;
      expect(detail.responses.length).to.equal(1);
    });
  });

  describe("post creation and anonymity", () => {
    it("should default to anonymous for questions and non-anonymous for answers", async () => {
      const mentor = await createTestUser(["Mentor"]);

      const question = await createPostImpl(
        mentor,
        null,
        "What is 1+1?",
        true,
        transaction,
      );
      void expect(question.author).to.be.null;

      const answer = await createPostImpl(
        mentor,
        question.id,
        "It is 2.",
        false,
        transaction,
      );
      void expect(answer.author).to.not.be.null;
      expect(answer.author?.id).to.equal(mentor.id);

      const qDetail = await getQuestionImpl(mentor, question.id, transaction);
      expect(qDetail.responses.length).to.equal(1);

      const resps = await getResponsesImpl(mentor, question.id, transaction);
      expect(resps.length).to.equal(1);
    });

    it("should anonymize deleted response with child responses and preserve tree", async () => {
      const mentor = await createTestUser(["Mentor"]);

      const question = await createPostImpl(
        mentor,
        null,
        "Tree question",
        true,
        transaction,
      );

      const answer = await createPostImpl(
        mentor,
        question.id,
        "Answer 1",
        false,
        transaction,
      );

      const reply = await createPostImpl(
        mentor,
        answer.id,
        "Reply to Answer 1",
        true,
        transaction,
      );

      // Delete the answer (which has a child reply)
      await deletePostImpl(mentor, answer.id, transaction);

      const qDetail = await getQuestionImpl(mentor, question.id, transaction);
      expect(qDetail.responses.length).to.equal(1);
      const deletedAns = qDetail.responses[0];
      void expect(deletedAns.isDeleted).to.be.true;
      void expect(deletedAns.author).to.be.null;

      const childResps = await getResponsesImpl(mentor, answer.id, transaction);
      expect(childResps.length).to.equal(1);
      expect(childResps[0].id).to.equal(reply.id);
    });

    it("should respect anonymity settings and feature flag for recording authorId", async () => {
      const mentor = await createTestUser(["Mentor"]);

      // Flag disabled: authorId should be null in DB for anonymous post
      features.shudongRecordAnonymousUserId = false;
      const q1 = await createPostImpl(
        mentor,
        null,
        "Anon q1",
        true,
        transaction,
      );
      const dbPost1 = await db.ShudongPost.findByPk(q1.id, { transaction });
      void expect(dbPost1?.authorId).to.be.null;

      // Flag enabled: authorId recorded in DB, but returned author is null
      features.shudongRecordAnonymousUserId = true;
      const q2 = await createPostImpl(
        mentor,
        null,
        "Anon q2",
        true,
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
        null,
        "Original text",
        false,
        transaction,
      );

      // Other user edit attempt should fail
      try {
        await updatePostImpl(otherUser, q.id, "Hacked", transaction);
        expect.fail("Should have failed");
      } catch (err: any) {
        expect(err.message).to.contain("没有权限访问");
      }

      // Author update
      const updated = await updatePostImpl(
        mentor,
        q.id,
        "Updated text",
        transaction,
      );
      expect(updated.markdown).to.equal("Updated text");
      void expect(updated.lastEditedAt).to.not.be.null;

      // Admin delete
      await deletePostImpl(admin, q.id, transaction);
      const dbPost = await db.ShudongPost.findByPk(q.id, { transaction });
      void expect(dbPost?.deletedAt).to.not.be.null;
    });

    it("should toggle upvotes correctly", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const q = await createPostImpl(
        mentor,
        null,
        "Upvote question",
        true,
        transaction,
      );

      // Upvote
      const up1 = await toggleUpvoteImpl(mentor, q.id, transaction);
      void expect(up1.userHasUpvoted).to.be.true;
      expect(up1.upvoteCount).to.equal(1);

      // Cancel upvote
      const up2 = await toggleUpvoteImpl(mentor, q.id, transaction);
      void expect(up2.userHasUpvoted).to.be.false;
      expect(up2.upvoteCount).to.equal(0);
    });
  });

  describe("draft message management", () => {
    it("should save and retrieve drafts for Shudong posts", async () => {
      const mentor = await createTestUser(["Mentor"]);

      await saveDraftImpl(mentor, "root", null, "Draft question", transaction);

      const d1 = await getDraftImpl(mentor, "root", null, transaction);
      expect(d1).to.equal("Draft question");

      // Overwrite existing draft
      await saveDraftImpl(
        mentor,
        "root",
        null,
        "Updated draft question",
        transaction,
      );
      const d1Updated = await getDraftImpl(mentor, "root", null, transaction);
      expect(d1Updated).to.equal("Updated draft question");

      // Creating post should clear the draft
      await createPostImpl(mentor, null, "Final post", true, transaction);

      const d2 = await getDraftImpl(mentor, "root", null, transaction);
      void expect(d2).to.be.null;
    });

    it("should handle post edit drafts and enforce parameter invariants", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const q = await createPostImpl(
        mentor,
        null,
        "Original post",
        true,
        transaction,
      );

      // Save and retrieve edit draft
      await saveDraftImpl(
        mentor,
        null,
        q.id,
        "Edit draft content",
        transaction,
      );
      const editDraft = await getDraftImpl(mentor, null, q.id, transaction);
      expect(editDraft).to.equal("Edit draft content");

      // Invalid parameter combinations should throw invariant error
      try {
        await saveDraftImpl(mentor, "root", q.id, "Invalid", transaction);
        expect.fail("Should have thrown invariant error");
      } catch (err: any) {
        expect(err.message).to.contain("one and only one");
      }

      try {
        await getDraftImpl(mentor, null, null, transaction);
        expect.fail("Should have thrown invariant error");
      } catch (err: any) {
        expect(err.message).to.contain("one and only one");
      }
    });
  });

  describe("input validation and error handling", () => {
    it("should reject empty post markdown on create and update", async () => {
      const mentor = await createTestUser(["Mentor"]);

      try {
        await createPostImpl(mentor, null, "   ", true, transaction);
        expect.fail("Should have thrown bad request error");
      } catch (err: any) {
        expect(err.message).to.contain("内容不能为空");
      }

      // Use isAnonymous=false so the author can update the post
      // and the empty-content validation is reached.
      const post = await createPostImpl(
        mentor,
        null,
        "Valid text",
        false,
        transaction,
      );

      try {
        await updatePostImpl(mentor, post.id, "   ", transaction);
        expect.fail("Should have thrown bad request error");
      } catch (err: any) {
        expect(err.message).to.contain("内容不能为空");
      }
    });

    it("should throw not found error when post does not exist", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const fakeId = crypto.randomUUID();

      try {
        await updatePostImpl(mentor, fakeId, "Updated text", transaction);
        expect.fail("Should have thrown not found error");
      } catch (err: any) {
        expect(err.message).to.contain("树洞帖子");
      }

      try {
        await deletePostImpl(mentor, fakeId, transaction);
        expect.fail("Should have thrown not found error");
      } catch (err: any) {
        expect(err.message).to.contain("树洞帖子");
      }

      try {
        await toggleUpvoteImpl(mentor, fakeId, transaction);
        expect.fail("Should have thrown not found error");
      } catch (err: any) {
        expect(err.message).to.contain("树洞帖子");
      }
    });
  });
});
