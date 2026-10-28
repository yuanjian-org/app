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
  toggleSubscriptionImpl,
  saveDraftImpl,
  getDraftImpl,
} from "./shudong";
import { shudongNewQuestionSubjectId } from "./shudongInternal";

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
    preference: any = null,
  ) {
    const user = await db.User.create(
      {
        email: `shudong-user-${Date.now()}-${crypto.randomUUID()}@test.com`,
        name: "Shudong Test User",
        roles,
        menteeStatus,
        preference,
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

  describe("subscriptions and auto-enrollment", () => {
    it("should toggle subscription to root questions", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const mentee = await createTestUser(["Mentee"], "现届学子", {
        shudongSubscribeAll: "no",
      });

      const q = await createPostImpl(
        mentor,
        null,
        "Sub question",
        true,
        transaction,
      );

      // Mentee starts unsubscribed due to preference = 'no'
      const detail1 = await getQuestionImpl(mentee, q.id, transaction);
      void expect(detail1.question.userIsSubscribed).to.be.false;

      // Mentee toggles subscription ON
      const sub1 = await toggleSubscriptionImpl(mentee, q.id, transaction);
      void expect(sub1.isSubscribed).to.be.true;

      const detail2 = await getQuestionImpl(mentee, q.id, transaction);
      void expect(detail2.question.userIsSubscribed).to.be.true;

      // Mentee toggles subscription OFF
      const sub2 = await toggleSubscriptionImpl(mentee, q.id, transaction);
      void expect(sub2.isSubscribed).to.be.false;
    });

    it("should auto-subscribe poster only to new question", async () => {
      const posterMentee = await createTestUser(["Mentee"], "现届学子", {
        shudongSubscribeAll: "default",
      });
      const mentorDefault = await createTestUser(["Mentor"]);
      const menteeOptIn = await createTestUser(["Mentee"], "现届学子", {
        shudongSubscribeAll: "yes",
      });
      const menteeOptOut = await createTestUser(["Mentee"], "现届学子", {
        shudongSubscribeAll: "no",
      });

      const q = await createPostImpl(
        posterMentee,
        null,
        "Auto sub question",
        true,
        transaction,
      );

      // Check subscriptions in DB: only poster should be subscribed
      const subs = await db.ShudongSubscription.findAll({
        where: { questionId: q.id },
        transaction,
      });
      const subUserIds = subs.map((s) => s.userId);

      expect(subUserIds).to.include(posterMentee.id);
      expect(subUserIds).not.to.include(mentorDefault.id);
      expect(subUserIds).not.to.include(menteeOptIn.id);
      expect(subUserIds).not.to.include(menteeOptOut.id);

      // A new-question notification should still be scheduled for global
      // subscribers
      const scheduledCount = await db.ScheduledNotification.count({
        where: {
          type: "ShudongQuestion",
          subjectId: shudongNewQuestionSubjectId,
        },
        transaction,
      });
      expect(scheduledCount).to.equal(1);
    });

    it("should auto-subscribe responder to root question and schedule notification", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const responder = await createTestUser(["Mentee"], "现届学子", {
        shudongSubscribeAll: "no",
      });

      const q = await createPostImpl(
        mentor,
        null,
        "Question",
        true,
        transaction,
      );

      // Responder posts a response
      await createPostImpl(
        responder,
        q.id,
        "Response text",
        false,
        transaction,
      );

      // Responder should now be subscribed
      const detail = await getQuestionImpl(responder, q.id, transaction);
      void expect(detail.question.userIsSubscribed).to.be.true;

      // Scheduled notification should be created for the question
      const scheduledCount = await db.ScheduledNotification.count({
        where: { type: "ShudongResponse", subjectId: q.id },
        transaction,
      });
      expect(scheduledCount).to.equal(1);
    });
  });

  describe("listQuestionsImpl and getQuestionImpl soft-delete filtering", () => {
    it("should hide soft-deleted questions with zero responses in listQuestionsImpl and getQuestionImpl", async () => {
      const mentor = await createTestUser(["Mentor"]);

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

      const resps = await getResponsesImpl(
        mentor,
        question.id,
        undefined,
        transaction,
      );
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

      const childResps = await getResponsesImpl(
        mentor,
        answer.id,
        undefined,
        transaction,
      );
      expect(childResps.length).to.equal(1);
      expect(childResps[0].id).to.equal(reply.id);
    });

    it("should record authorId in database for anonymous post but anonymize author in formatted output", async () => {
      const mentor = await createTestUser(["Mentor"]);

      const q = await createPostImpl(
        mentor,
        null,
        "Anon question",
        true,
        transaction,
      );
      const dbPost = await db.ShudongPost.findByPk(q.id, { transaction });
      expect(dbPost?.authorId).to.equal(mentor.id);
      void expect(q.author).to.be.null;
    });

    it("should assign pseudo-anonymous labels correctly within thread", async () => {
      const op = await createTestUser(["Mentor"]);
      const userA = await createTestUser(["Mentee"], "现届学子");
      const userB = await createTestUser(["Mentee"], "现届学子");

      // OP creates anonymous question
      const q = await createPostImpl(
        op,
        null,
        "Question by OP",
        true,
        transaction,
      );
      expect(q.anonymousName).to.equal("匿名楼主");

      // User A responds anonymously -> "匿名 甲"
      const respA = await createPostImpl(
        userA,
        q.id,
        "Response by User A",
        true,
        transaction,
      );
      expect(respA.anonymousName).to.equal("匿名 甲");

      // User B responds anonymously -> "匿名 乙"
      const respB = await createPostImpl(
        userB,
        q.id,
        "Response by User B",
        true,
        transaction,
      );
      expect(respB.anonymousName).to.equal("匿名 乙");

      // OP responds anonymously to their own question -> "匿名楼主"
      const respOp = await createPostImpl(
        op,
        q.id,
        "OP reply",
        true,
        transaction,
      );
      expect(respOp.anonymousName).to.equal("匿名楼主");

      // User A replies again anonymously -> still "匿名 甲"
      const respA2 = await createPostImpl(
        userA,
        respB.id,
        "User A follow-up",
        true,
        transaction,
      );
      expect(respA2.anonymousName).to.equal("匿名 甲");

      // Verify thread scoped in getQuestionImpl
      const detail = await getQuestionImpl(op, q.id, transaction);
      expect(detail.question.anonymousName).to.equal("匿名楼主");
      const rA = detail.responses.find((r) => r.id === respA.id);
      const rB = detail.responses.find((r) => r.id === respB.id);
      const rOp = detail.responses.find((r) => r.id === respOp.id);

      expect(rA?.anonymousName).to.equal("匿名 甲");
      expect(rB?.anonymousName).to.equal("匿名 乙");
      expect(rOp?.anonymousName).to.equal("匿名楼主");
    });

    it("should scope pseudo-anonymous labels per thread/question", async () => {
      const user1 = await createTestUser(["Mentor"]);
      const user2 = await createTestUser(["Mentee"], "现届学子");

      // Thread 1: user1 is OP
      const q1 = await createPostImpl(user1, null, "Q1", true, transaction);
      const r1 = await createPostImpl(user2, q1.id, "R1", true, transaction);

      // Thread 2: user2 is OP
      const q2 = await createPostImpl(user2, null, "Q2", true, transaction);
      const r2 = await createPostImpl(user1, q2.id, "R2", true, transaction);

      expect(q1.anonymousName).to.equal("匿名楼主");
      expect(r1.anonymousName).to.equal("匿名 甲"); // user2 in thread 1

      expect(q2.anonymousName).to.equal("匿名楼主");
      expect(r2.anonymousName).to.equal("匿名 甲"); // user1 in thread 2
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

  describe("nested response count handling", () => {
    it("should include all direct and indirect responses in responseCount when creating nested replies", async () => {
      const mentor = await createTestUser(["Mentor"]);

      // Question Q
      const q = await createPostImpl(
        mentor,
        null,
        "Nested Question",
        true,
        transaction,
      );
      expect(q.responseCount).to.equal(0);

      // Reply R1 under Q
      const r1 = await createPostImpl(
        mentor,
        q.id,
        "Response 1",
        false,
        transaction,
      );

      // Reply R1_1 under R1
      const r1_1 = await createPostImpl(
        mentor,
        r1.id,
        "Response 1.1",
        false,
        transaction,
      );

      // Reply R1_1_1 under R1_1
      const r1_1_1 = await createPostImpl(
        mentor,
        r1_1.id,
        "Response 1.1.1",
        false,
        transaction,
      );

      expect(r1_1_1.responseCount).to.equal(0);

      // Verify response counts across all ancestors
      const detailQ = await getQuestionImpl(mentor, q.id, transaction);
      expect(detailQ.question.responseCount).to.equal(3);

      const dbR1 = await db.ShudongPost.findByPk(r1.id, { transaction });
      expect(dbR1?.responseCount).to.equal(2);

      const dbR1_1 = await db.ShudongPost.findByPk(r1_1.id, { transaction });
      expect(dbR1_1?.responseCount).to.equal(1);
    });

    it("should correctly update responseCount on ancestors when deleting nested responses", async () => {
      const mentor = await createTestUser(["Mentor"]);

      const q = await createPostImpl(
        mentor,
        null,
        "Tree Question",
        true,
        transaction,
      );
      const r1 = await createPostImpl(mentor, q.id, "R1", false, transaction);
      const r1_1 = await createPostImpl(
        mentor,
        r1.id,
        "R1.1",
        false,
        transaction,
      );

      // Soft delete R1 (which has child R1.1)
      await deletePostImpl(mentor, r1.id, transaction);

      // R1 is now soft-deleted placeholder. responseCount on Q is still 2 (R1 placeholder + R1.1).
      const dbQ1 = await db.ShudongPost.findByPk(q.id, { transaction });
      expect(dbQ1?.responseCount).to.equal(2);

      // Delete R1.1 (leaf node)
      await deletePostImpl(mentor, r1_1.id, transaction);

      // R1.1 deletion causes R1 to drop to responseCount 0 -> R1 becomes hidden -> Q drops to responseCount 0.
      const dbQ2 = await db.ShudongPost.findByPk(q.id, { transaction });
      expect(dbQ2?.responseCount).to.equal(0);
    });
  });

  describe("AI generated post flag", () => {
    it("should default isAiGenerated to false when creating a post", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const post = await createPostImpl(
        mentor,
        null,
        "Human question",
        true,
        transaction,
      );
      void expect(post.isAiGenerated).to.be.false;
    });

    it("should return isAiGenerated true when set in DB", async () => {
      const mentor = await createTestUser(["Mentor"]);
      const post = await createPostImpl(
        mentor,
        null,
        "AI question",
        true,
        transaction,
      );
      await db.ShudongPost.update(
        { isAiGenerated: true },
        { where: { id: post.id }, transaction },
      );
      const detail = await getQuestionImpl(mentor, post.id, transaction);
      void expect(detail.question.isAiGenerated).to.be.true;
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
