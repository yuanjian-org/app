import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  createLandmarkAssessmentImpl,
  listLandmarkAssessmentsImpl,
} from "./map";

describe("map routes", () => {
  let transaction: Transaction;
  let testUser: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    testUser = await db.User.create(
      {
        email: `map-test-${Date.now()}@example.com`,
        name: "Test Map User",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("createLandmarkAssessmentImpl & listLandmarkAssessmentsImpl", () => {
    it("should successfully create and list a landmark assessment", async () => {
      const landmarkName = "Test Landmark";
      const score = 4;
      const markdown = "This is a test assessment markdown.";

      await createLandmarkAssessmentImpl(
        testUser.id,
        landmarkName,
        score,
        markdown,
        transaction,
      );

      const assessments = await listLandmarkAssessmentsImpl(
        testUser.id,
        landmarkName,
        transaction,
      );

      expect(assessments).to.be.an("array").that.has.lengthOf(1);
      const assessment = assessments[0];
      // assessment returned from API query doesn't have userId, it just has score, markdown, createdAt
      expect(assessment.score).to.equal(score);
      expect(assessment.markdown).to.equal(markdown);

    });

    it("should return an empty array if no assessments exist for the landmark", async () => {
      const assessments = await listLandmarkAssessmentsImpl(
        testUser.id,
        "Non-existent Landmark",
        transaction,
      );

      expect(assessments).to.be.an("array").that.is.empty;
    });

    it("should allow multiple assessments for the same landmark and user", async () => {
      const landmarkName = "Another Test Landmark";

      await createLandmarkAssessmentImpl(
        testUser.id,
        landmarkName,
        3,
        "First assessment",
        transaction,
      );

      await createLandmarkAssessmentImpl(
        testUser.id,
        landmarkName,
        4,
        "Second assessment",
        transaction,
      );

      const assessments = await listLandmarkAssessmentsImpl(
        testUser.id,
        landmarkName,
        transaction,
      );

      expect(assessments).to.be.an("array").that.has.lengthOf(2);
    });
  });
});
