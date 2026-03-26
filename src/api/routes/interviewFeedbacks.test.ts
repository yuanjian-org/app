import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  getInterviewFeedbackImpl,
  updateInterviewFeedbackImpl,
  date2etag,
} from "./interviewFeedbacks";
import { createInterview } from "./interviews";

describe("interviewFeedbacks", () => {
  let transaction: Transaction;
  let mentee: any;
  let interviewer: any;
  let otherUser: any;
  let manager: any;
  let interviewId: string;
  let feedbackId: string;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    mentee = await db.User.create(
      { email: `mentee-${Date.now()}@example.com`, name: "Mentee", roles: [] },
      { transaction },
    );
    interviewer = await db.User.create(
      {
        email: `interviewer-${Date.now()}@example.com`,
        name: "Interviewer",
        roles: [],
      },
      { transaction },
    );
    otherUser = await db.User.create(
      {
        email: `other-${Date.now()}@example.com`,
        name: "Other User",
        roles: [],
      },
      { transaction },
    );
    manager = await db.User.create(
      {
        email: `manager-${Date.now()}@example.com`,
        name: "Manager",
        roles: ["MentorshipManager"],
      },
      { transaction },
    );

    interviewId = await createInterview(
      "MenteeInterview",
      null,
      mentee.id,
      [interviewer.id],
      transaction,
    );

    const f = await db.InterviewFeedback.findOne({
      where: { interviewId },
      transaction,
    });
    feedbackId = f!.id;
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("getInterviewFeedbackImpl", () => {
    it("should allow interviewer to access feedback", async () => {
      const f = await getInterviewFeedbackImpl(
        feedbackId,
        { ...interviewer.dataValues, roles: [] },
        false,
        transaction,
      );
      expect(f).to.not.be.null;
      expect(f.id).to.equal(feedbackId);
    });

    it("should allow MentorshipManager to access feedback", async () => {
      const f = await getInterviewFeedbackImpl(
        feedbackId,
        { ...manager.dataValues, roles: ["MentorshipManager"] },
        false,
        transaction,
      );
      expect(f).to.not.be.null;
      expect(f.id).to.equal(feedbackId);
    });

    it("should deny unauthorized user to access feedback", async () => {
      try {
        await getInterviewFeedbackImpl(
          feedbackId,
          { ...otherUser.dataValues, roles: [] },
          false,
          transaction,
        );
        expect.fail("Should have thrown noPermissionError");
      } catch (e: any) {
        expect(e.message).to.include("没有权限");
      }
    });

    it("should deny MentorshipManager if allowOnlyInterviewer is true", async () => {
      try {
        await getInterviewFeedbackImpl(
          feedbackId,
          { ...manager.dataValues, roles: ["MentorshipManager"] },
          true,
          transaction,
        );
        expect.fail("Should have thrown noPermissionError");
      } catch (e: any) {
        expect(e.message).to.include("没有权限");
      }
    });
  });

  describe("updateInterviewFeedbackImpl", () => {
    it("should allow interviewer to update feedback with correct etag", async () => {
      const f = await db.InterviewFeedback.findByPk(feedbackId, { transaction });
      const etag = date2etag(f!.feedbackUpdatedAt);

      const mockFeedback = {
        content: "Great performance",
        status: "Draft",
      } as any;

      const newEtag = await updateInterviewFeedbackImpl(
        feedbackId,
        { ...interviewer.dataValues, roles: [] },
        mockFeedback,
        etag,
        transaction,
      );

      const updatedF = await db.InterviewFeedback.findByPk(feedbackId, { transaction });
      expect(updatedF!.feedback.content).to.equal("Great performance");
      expect(newEtag).to.not.equal(etag);
    });

    it("should throw conflictError when etag is incorrect", async () => {
      const mockFeedback = {
        content: "Great performance",
        status: "Draft",
      } as any;

      try {
        await updateInterviewFeedbackImpl(
          feedbackId,
          { ...interviewer.dataValues, roles: [] },
          mockFeedback,
          12345, // Invalid etag
          transaction,
        );
        expect.fail("Should have thrown conflictError");
      } catch (e: any) {
        expect(e.message).to.include("冲突");
      }
    });

    it("should throw noPermissionError if unauthorized user tries to update", async () => {
      const f = await db.InterviewFeedback.findByPk(feedbackId, { transaction });
      const etag = date2etag(f!.feedbackUpdatedAt);

      const mockFeedback = {
        content: "Great performance",
        status: "Draft",
      } as any;

      try {
        await updateInterviewFeedbackImpl(
          feedbackId,
          { ...manager.dataValues, roles: ["MentorshipManager"] }, // Not interviewer
          mockFeedback,
          etag,
          transaction,
        );
        expect.fail("Should have thrown noPermissionError");
      } catch (e: any) {
        expect(e.message).to.include("没有权限");
      }
    });
  });
});
