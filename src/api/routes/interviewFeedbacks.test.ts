import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import User from "../../shared/User";
import { getInterviewFeedback, updateInterviewFeedback } from "./interviewFeedbacks";

describe("interviewFeedbacks internal implementations", () => {
  let transaction: Transaction;
  let meInterviewer: User;
  let meManager: User;
  let meOther: User;
  let interviewee: User;
  let interview: any;
  let feedbackId: string;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create users
    meInterviewer = (
      await db.User.create(
        { email: `interviewer-${Date.now()}@example.com`, name: "面试官", roles: ["Interviewer"] },
        { transaction }
      )
    ).toJSON() as User;

    meManager = (
      await db.User.create(
        { email: `manager-${Date.now()}@example.com`, name: "管理员", roles: ["MentorshipManager"] },
        { transaction }
      )
    ).toJSON() as User;

    meOther = (
      await db.User.create(
        { email: `other-${Date.now()}@example.com`, name: "路人", roles: ["Volunteer"] },
        { transaction }
      )
    ).toJSON() as User;

    interviewee = (
      await db.User.create(
        { email: `interviewee-${Date.now()}@example.com`, name: "候选人", roles: ["Volunteer"] },
        { transaction }
      )
    ).toJSON() as User;

    // Create Interview
    interview = await db.Interview.create(
      {
        type: "MenteeInterview",
        intervieweeId: interviewee.id,
      },
      { transaction }
    );

    // Create InterviewFeedback
    const feedback = await db.InterviewFeedback.create(
      {
        interviewId: interview.id,
        interviewerId: meInterviewer.id,
      },
      { transaction }
    );
    feedbackId = feedback.id;
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("getInterviewFeedback", () => {
    it("interviewer should get their own feedback", async () => {
      const f = await getInterviewFeedback(feedbackId, meInterviewer, false, transaction);
      expect(f.id).to.equal(feedbackId);
      expect(f.interviewer.id).to.equal(meInterviewer.id);
    });

    it("MentorshipManager should get feedback when not forcing only interviewer", async () => {
      const f = await getInterviewFeedback(feedbackId, meManager, false, transaction);
      expect(f.id).to.equal(feedbackId);
    });

    it("unauthorized user should throw no permission error", async () => {
      try {
        await getInterviewFeedback(feedbackId, meOther, false, transaction);
        expect.fail("Should throw no permission error");
      } catch (e: any) {
        expect(e.message).to.include("没有权限访问");
      }
    });
  });

  describe("updateInterviewFeedback", () => {
    it("interviewer should update their own feedback and return new etag", async () => {
      const initialFeedback = await db.InterviewFeedback.findByPk(feedbackId, { transaction });

      const newFeedbackData = {
        action: "Accept" as const,
        comments: "Good candidate"
      };

      const newEtag = await updateInterviewFeedback(meInterviewer, {
        id: feedbackId,
        feedback: newFeedbackData,
        etag: 0,
      }, transaction);

      expect(newEtag).to.be.greaterThan(0);

      const updated = await db.InterviewFeedback.findByPk(feedbackId, { transaction });
      expect(updated?.feedback).to.deep.equal(newFeedbackData);
    });

    it("MentorshipManager should not be able to update interviewer feedback", async () => {
      const newFeedbackData = {
        action: "Accept" as const,
        comments: "Manager override"
      };

      try {
        await updateInterviewFeedback(meManager, {
          id: feedbackId,
          feedback: newFeedbackData,
          etag: 0,
        }, transaction);
        expect.fail("Should throw no permission error");
      } catch (e: any) {
        expect(e.message).to.include("没有权限访问");
      }
    });

    it("should fail with conflict error if etag is mismatched", async () => {
      const newFeedbackData = {
        action: "Accept" as const,
        comments: "Update 1"
      };

      const newEtag = await updateInterviewFeedback(meInterviewer, {
        id: feedbackId,
        feedback: newFeedbackData,
        etag: 0,
      }, transaction);

      try {
        await updateInterviewFeedback(meInterviewer, {
          id: feedbackId,
          feedback: { ...newFeedbackData, comments: "Update 2" },
          etag: 0, // Using old etag
        }, transaction);
        expect.fail("Should throw conflict error");
      } catch (e: any) {
        expect(e.message).to.include("冲突"); // conflict error typical wording, or we just check it throws
      }
    });
  });
});
