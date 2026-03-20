import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  createAssessmentImpl,
  updateAssessmentImpl,
  getAssessmentImpl,
  listAllForMentorshipImpl,
} from "./assessments";
import { createMentorship } from "./mentorships";

describe("assessments", () => {
  let transaction: Transaction;
  let mentee: any;
  let mentor: any;
  let anotherMentor: any;
  let mentorshipId: string;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    mentee = await db.User.create(
      {
        email: "assessment-mentee@test.com",
        name: "Assessment Mentee",
        roles: ["Mentee"],
      },
      { transaction },
    );

    mentor = await db.User.create(
      {
        email: "assessment-mentor@test.com",
        name: "Assessment Mentor",
        roles: ["Mentor"],
      },
      { transaction },
    );

    anotherMentor = await db.User.create(
      {
        email: "assessment-other-mentor@test.com",
        name: "Assessment Other Mentor",
        roles: ["Mentor"],
      },
      { transaction },
    );

    const mentorship = await createMentorship(
      mentor.id,
      mentee.id,
      false,
      null,
      transaction,
    );
    mentorshipId = mentorship.id;
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("createAssessmentImpl", () => {
    it("should successfully create an assessment", async () => {
      const assessmentId = await createAssessmentImpl(
        mentorshipId,
        transaction,
      );
      void expect(assessmentId).to.be.a("string");

      const assessment = await db.Assessment.findByPk(assessmentId, {
        transaction,
      });
      void expect(assessment).to.not.be.null;
      void expect(assessment?.partnershipId).to.equal(mentorshipId);
    });
  });

  describe("updateAssessmentImpl", () => {
    it("should successfully update an assessment summary", async () => {
      const assessmentId = await createAssessmentImpl(
        mentorshipId,
        transaction,
      );

      const newSummary = "This is a new test summary.";
      await updateAssessmentImpl(assessmentId, newSummary, transaction);

      const assessment = await db.Assessment.findByPk(assessmentId, {
        transaction,
      });
      void expect(assessment?.summary).to.equal(newSummary);
    });

    it("should throw notFoundError if assessment does not exist", async () => {
      let errorThrown = false;
      try {
        await updateAssessmentImpl(
          "00000000-0000-0000-0000-000000000000",
          "Summary",
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(
          "没有找到评估00000000-0000-0000-0000-000000000000",
        );
      }
      void expect(errorThrown).to.be.true;
    });
  });

  describe("getAssessmentImpl", () => {
    it("should fetch an existing assessment", async () => {
      const assessmentId = await createAssessmentImpl(
        mentorshipId,
        transaction,
      );
      const summary = "Test fetch summary";
      await updateAssessmentImpl(assessmentId, summary, transaction);

      const assessment = await getAssessmentImpl(assessmentId, transaction);
      void expect(assessment.id).to.equal(assessmentId);
      void expect(assessment.summary).to.equal(summary);
    });

    it("should throw notFoundError if assessment does not exist", async () => {
      let errorThrown = false;
      try {
        await getAssessmentImpl(
          "00000000-0000-0000-0000-000000000000",
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(
          "没有找到评估00000000-0000-0000-0000-000000000000",
        );
      }
      void expect(errorThrown).to.be.true;
    });
  });

  describe("listAllForMentorshipImpl", () => {
    it("should list all assessments for a mentorship if user is the mentor", async () => {
      await createAssessmentImpl(mentorshipId, transaction);
      await createAssessmentImpl(mentorshipId, transaction);

      const assessments = await listAllForMentorshipImpl(
        mentorshipId,
        mentor.id,
        transaction,
      );
      void expect(assessments.length).to.equal(2);
    });

    it("should throw noPermissionError if user is not the mentor of the mentorship", async () => {
      let errorThrown = false;
      try {
        await listAllForMentorshipImpl(
          mentorshipId,
          anotherMentor.id,
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        void expect(e.message).to.equal(
          `没有权限访问一对一匹配${mentorshipId}`,
        );
      }
      void expect(errorThrown).to.be.true;
    });
  });
});
