import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  createLandmarkAssessmentImpl,
  listLandmarkAssessmentsImpl,
} from "./map";

describe("Map routes", () => {
  let transaction: Transaction;
  let testUser: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    testUser = await db.User.create(
      {
        email: `map-test-${Date.now()}@example.com`,
        name: "Map Test User",
        roles: ["Mentee"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("createLandmarkAssessmentImpl", () => {
    it("should create a new landmark assessment", async () => {
      const landmark = "TestLandmark";
      const score = 4;
      const markdown = "This is a test assessment.";

      await createLandmarkAssessmentImpl(
        testUser.id,
        landmark,
        score,
        markdown,
        transaction,
      );

      const assessment = await db.LandmarkAssessment.findOne({
        where: { userId: testUser.id, landmark },
        transaction,
      });

      expect(assessment).to.not.equal(null);
      expect(assessment?.score).to.equal(score);
      expect(assessment?.markdown).to.equal(markdown);
    });
  });

  describe("listLandmarkAssessmentsImpl", () => {
    it("should return an empty array if no assessments exist", async () => {
      const result = await listLandmarkAssessmentsImpl(
        testUser.id,
        "NonExistentLandmark",
        transaction,
      );

      expect(result.length).to.equal(0);
    });

    it("should list all landmark assessments for a given user and landmark", async () => {
      const landmark = "TestLandmark";

      await createLandmarkAssessmentImpl(
        testUser.id,
        landmark,
        3,
        "First assessment.",
        transaction,
      );

      await createLandmarkAssessmentImpl(
        testUser.id,
        landmark,
        4,
        "Second assessment.",
        transaction,
      );

      const result = await listLandmarkAssessmentsImpl(
        testUser.id,
        landmark,
        transaction,
      );

      expect(result.length).to.equal(2);

      // Values are sorted depending on attributesAndIncludes order or DB order
      // We just check the contents exist
      const scores = result.map((a) => a.score);
      expect(scores).to.include(3);
      expect(scores).to.include(4);
    });
  });
});
