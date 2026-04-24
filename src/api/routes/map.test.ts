import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  listLandmarksImpl,
  createLandmarkAssessmentImpl,
  listLandmarkAssessmentsImpl,
} from "./map";

describe("map routes", () => {
  let transaction: Transaction;
  let testUser: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create a dummy user to associate with assessments
    testUser = await db.User.create(
      {
        email: "map-test-user@test.com",
        name: "Map Test User",
        roles: ["Mentee"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("listLandmarksImpl", () => {
    it("should successfully list landmarks for a valid latitude", async () => {
      // "个人成长" is a valid directory under public/map/
      const landmarks = await listLandmarksImpl("个人成长");

      // Verify it returns an array of landmarks
      expect(landmarks).to.be.an("array");
      expect(landmarks.length).to.be.greaterThan(0);

      // Verify the basic structure of a parsed landmark
      const firstLandmark = landmarks[0];
      expect(firstLandmark).to.have.property("名称");
      expect(firstLandmark).to.have.property("定义");
      expect(firstLandmark).to.have.property("经度");
      expect(firstLandmark).to.have.property("纬度");
      expect(firstLandmark).to.have.property("层级");
      expect(firstLandmark.纬度).to.equal("个人成长");
    });

    it("should fail if the latitude directory does not exist", async () => {
      let errorThrown = false;
      try {
        await listLandmarksImpl("InvalidLatitude");
      } catch (e: any) {
        errorThrown = true;
      }
      expect(errorThrown).to.equal(true);
    });
  });

  describe("createLandmarkAssessmentImpl", () => {
    it("should successfully create a landmark assessment", async () => {
      const landmarkName = "同理心";
      const score = 3;
      const markdown = "Test markdown content for assessment";

      const assessment = await createLandmarkAssessmentImpl(
        testUser.id,
        landmarkName,
        score,
        markdown,
        transaction,
      );

      expect(assessment).to.not.equal(null);
      expect(assessment.userId).to.equal(testUser.id);
      expect(assessment.landmark).to.equal(landmarkName);
      expect(assessment.score).to.equal(score);
      expect(assessment.markdown).to.equal(markdown);

      // Verify it was actually saved to db in this transaction
      const fetched = await db.LandmarkAssessment.findOne({
        where: { id: assessment.id },
        transaction,
      });

      expect(fetched).to.not.equal(null);
      expect(fetched!.score).to.equal(score);
    });
  });

  describe("listLandmarkAssessmentsImpl", () => {
    it("should retrieve landmark assessments for a user and landmark", async () => {
      const landmarkName = "自我认知";

      // Create test data
      await createLandmarkAssessmentImpl(
        testUser.id,
        landmarkName,
        2,
        "First eval",
        transaction,
      );

      await createLandmarkAssessmentImpl(
        testUser.id,
        landmarkName,
        4,
        "Second eval",
        transaction,
      );

      // Verify list function
      const assessments = await listLandmarkAssessmentsImpl(
        testUser.id,
        landmarkName,
        transaction,
      );

      expect(assessments).to.be.an("array");
      expect(assessments.length).to.equal(2);

      // landmarkAssessmentAttributes only selects 'createdAt', 'score', 'markdown', 'assessorId'
      const firstResult = assessments[0];

      // Ensure specific fields exist and others don't
      expect(firstResult).to.have.property("score");
      expect(firstResult).to.have.property("markdown");
      expect(firstResult).to.have.property("createdAt");

      // Sequelize instance when cast to plain might have other props, but we can check values
      const scores = assessments.map((a: any) => a.score).sort();
      expect(scores[0]).to.equal(2);
      expect(scores[1]).to.equal(4);
    });

    it("should return empty array when no assessments exist", async () => {
      const assessments = await listLandmarkAssessmentsImpl(
        testUser.id,
        "好奇心",
        transaction,
      );

      expect(assessments).to.be.an("array");
      expect(assessments.length).to.equal(0);
    });
  });
});
