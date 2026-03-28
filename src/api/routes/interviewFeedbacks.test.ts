import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  getInterviewFeedbackImpl,
  updateInterviewFeedbackImpl,
} from "./interviewFeedbacks";
describe("interviewFeedbacks routes", () => {
  let transaction: Transaction;
  let interviewee: any;
  let interviewer: any;
  let manager: any;
  let stranger: any;
  let interview: any;
  let interviewFeedback: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create users
    interviewee = await db.User.create(
      {
        email: `interviewee-${Date.now()}@example.com`,
        name: "Test Interviewee",
        roles: [],
      },
      { transaction },
    );

    interviewer = await db.User.create(
      {
        email: `interviewer-${Date.now()}@example.com`,
        name: "Test Interviewer",
        roles: [],
      },
      { transaction },
    );

    manager = await db.User.create(
      {
        email: `manager-${Date.now()}@example.com`,
        name: "Test Manager",
        roles: ["MentorshipManager"],
      },
      { transaction },
    );

    stranger = await db.User.create(
      {
        email: `stranger-${Date.now()}@example.com`,
        name: "Test Stranger",
        roles: [],
      },
      { transaction },
    );

    // Create Interview
    interview = await db.Interview.create(
      {
        type: "MenteeInterview",
        intervieweeId: interviewee.id,
      },
      { transaction },
    );

    // Create Interview Feedback
    interviewFeedback = await db.InterviewFeedback.create(
      {
        interviewId: interview.id,
        interviewerId: interviewer.id,
        feedback: { content: "initial feedback" },
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("getInterviewFeedbackImpl", () => {
    it("should allow interviewer to access", async () => {
      const f = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        interviewer,
        false,
        transaction,
      );
      expect(f.id).to.equal(interviewFeedback.id);
    });

    it("should allow MentorshipManager to access", async () => {
      const f = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        manager,
        false,
        transaction,
      );
      expect(f.id).to.equal(interviewFeedback.id);
    });

    it("should deny access to stranger", async () => {
      try {
        await getInterviewFeedbackImpl(
          interviewFeedback.id,
          stranger,
          false,
          transaction,
        );
        expect.fail("Should have thrown noPermissionError");
      } catch (e: any) {
        expect(e.message).to.include("没有权限访问");
      }
    });
  });

  describe("updateInterviewFeedbackImpl", () => {
    it("should allow interviewer to update with correct ETag", async () => {
      await getInterviewFeedbackImpl(
        interviewFeedback.id,
        interviewer,
        true,
        transaction,
      );
      // feedbackUpdatedAt is initially null for create without it, so date2etag
      // gives 0.
      const initialEtag = 0;

      const newEtag = await updateInterviewFeedbackImpl(
        interviewFeedback.id,
        { content: "updated feedback" },
        initialEtag,
        interviewer,
        transaction,
      );

      const fAfter = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        interviewer,
        true,
        transaction,
      );
      expect(fAfter.feedback).to.deep.equal({ content: "updated feedback" });
      expect(newEtag).to.be.greaterThan(0);
    });

    it("should fail to update with incorrect ETag (optimistic concurrency control)", async () => {
      try {
        await updateInterviewFeedbackImpl(
          interviewFeedback.id,
          { content: "updated feedback" },
          123456789, // Fake ETag
          interviewer,
          transaction,
        );
        expect.fail("Should have thrown conflictError");
      } catch (e: any) {
        expect(e.message).to.equal("版本冲突。");
      }
    });

    it("should not allow non-interviewer to update even if they are manager", async () => {
      try {
        await updateInterviewFeedbackImpl(
          interviewFeedback.id,
          { content: "manager updated feedback" },
          0,
          manager,
          transaction,
        );
        expect.fail("Should have thrown noPermissionError");
      } catch (e: any) {
        expect(e.message).to.include("没有权限访问");
      }
    });
  });
});
