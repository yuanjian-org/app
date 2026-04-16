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
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    user1 = await db.User.create(
      {
        email: `map-user1-${Date.now()}@example.com`,
        name: "Map User 1",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    user2 = await db.User.create(
      {
        email: `map-user2-${Date.now()}@example.com`,
        name: "Map User 2",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch {
        // Ignored
      }
    }
  });

  describe("createLandmarkAssessmentImpl", () => {
    it("should successfully create a landmark assessment", async () => {
      const landmark = "Test Landmark A";
      const score = 4; // ZodColumn constraints may restrict max score
      const markdown = "This is a great place!";

      const assessment = await createLandmarkAssessmentImpl(
        user1.id,
        landmark,
        score,
        markdown,
        transaction,
      );

      expect(assessment.userId).to.equal(user1.id);
      expect(assessment.landmark).to.equal(landmark);
      expect(assessment.score).to.equal(score);
      expect(assessment.markdown).to.equal(markdown);

      // Verify it's in the database
      const dbAssessment = await db.LandmarkAssessment.findOne({
        where: { id: assessment.id },
        transaction,
      });

      expect(dbAssessment).not.to.equal(null);
      expect(dbAssessment!.score).to.equal(score);
    });
  });

  describe("listLandmarkAssessmentsImpl", () => {
    it("should return an empty list if no assessments exist for the user and landmark", async () => {
      const results = await listLandmarkAssessmentsImpl(
        user1.id,
        "Non-existent Landmark",
        transaction,
      );
      expect(results.length).to.equal(0);
    });

    it("should list assessments for a specific user and landmark, filtering out internal fields", async () => {
      const landmark = "Test Landmark B";

      // User 1 creates two assessments for Landmark B
      await createLandmarkAssessmentImpl(
        user1.id,
        landmark,
        4,
        "First review",
        transaction,
      );

      await createLandmarkAssessmentImpl(
        user1.id,
        landmark,
        3,
        "Second review",
        transaction,
      );

      // User 2 creates an assessment for Landmark B (should not be in results)
      await createLandmarkAssessmentImpl(
        user2.id,
        landmark,
        1,
        "Bad place",
        transaction,
      );

      // User 1 creates an assessment for a different landmark (should not be in results)
      await createLandmarkAssessmentImpl(
        user1.id,
        "Other Landmark",
        4,
        "Other review",
        transaction,
      );

      const results = await listLandmarkAssessmentsImpl(
        user1.id,
        landmark,
        transaction,
      );

      expect(results.length).to.equal(2);

      // Ensure only returned fields according to landmarkAssessmentAttributes are present
      // and internal fields like userId and landmark are not returned
      const firstResult = results[0].toJSON() as any;
      expect(firstResult.score).not.to.equal(undefined);
      expect(firstResult.markdown).not.to.equal(undefined);
      expect(firstResult.createdAt).not.to.equal(undefined);

      expect(firstResult.userId).to.equal(undefined);
      expect(firstResult.landmark).to.equal(undefined);
      expect(firstResult.id).to.equal(undefined); // id is also not in attributes typically
    });
  });
});
