import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  createLandmarkAssessmentImpl,
  listLandmarkAssessmentsImpl,
} from "./map";

describe("Map Router", () => {
  let transaction: Transaction;
  let user: any;
  let assessor: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    user = await db.User.create(
      {
        email: "test-user@example.com",
        name: "Test User",
        roles: [],
      },
      { transaction },
    );

    assessor = await db.User.create(
      {
        email: "test-assessor@example.com",
        name: "Test Assessor",
        roles: ["Mentor"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
    }
  });

  describe("createLandmarkAssessmentImpl", () => {
    it("should successfully create a landmark assessment", async () => {
      await createLandmarkAssessmentImpl(
        user.id,
        "Test Landmark",
        3,
        "Test markdown content",
        transaction,
      );

      const assessments = await db.LandmarkAssessment.findAll({
        where: { userId: user.id },
        transaction,
      });

      expect(assessments).to.have.lengthOf(1);
      expect(assessments[0].landmark).to.equal("Test Landmark");
      expect(assessments[0].score).to.equal(3);
      expect(assessments[0].markdown).to.equal("Test markdown content");
      void expect(assessments[0].assessorId).to.be.null; // Default is null for self-assessment
    });
  });

  describe("listLandmarkAssessmentsImpl", () => {
    it("should list landmark assessments for a specific user and landmark", async () => {
      await db.LandmarkAssessment.create(
        {
          userId: user.id,
          landmark: "Target Landmark",
          score: 4,
          markdown: "Target markdown",
        },
        { transaction },
      );

      await db.LandmarkAssessment.create(
        {
          userId: user.id,
          landmark: "Other Landmark",
          score: 2,
          markdown: "Other markdown",
        },
        { transaction },
      );

      const assessments = await listLandmarkAssessmentsImpl(
        user.id,
        "Target Landmark",
        transaction,
      );

      expect(assessments).to.have.lengthOf(1);
      expect(assessments[0].score).to.equal(4);
      expect(assessments[0].markdown).to.equal("Target markdown");
    });
  });
});
