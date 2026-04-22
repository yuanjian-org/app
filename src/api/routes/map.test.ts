import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  createLandmarkAssessmentImpl,
  listLandmarkAssessmentsImpl,
} from "./map";
import { v4 as uuidv4 } from "uuid";

describe("map routes", () => {
  let transaction: Transaction;
  let testUser: any;
  let testAssessor: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create a test user (mentee)
    testUser = await db.User.create(
      {
        id: uuidv4(),
        email: `testuser-${Date.now()}@example.com`,
        name: "Test User",
        roles: [],
      },
      { transaction },
    );

    // Create a test assessor (mentor)
    testAssessor = await db.User.create(
      {
        id: uuidv4(),
        email: `testassessor-${Date.now()}@example.com`,
        name: "Test Assessor",
        roles: ["Mentor"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("createLandmarkAssessmentImpl", () => {
    it("should successfully create a landmark assessment", async () => {
      const input = {
        userId: testUser.id,
        landmark: "Test Landmark",
        score: 4,
        markdown: "This is a test assessment",
      };

      const assessment = await createLandmarkAssessmentImpl(input, transaction);

      expect(assessment).to.not.be.null;
      expect(assessment.userId).to.equal(testUser.id);
      expect(assessment.landmark).to.equal("Test Landmark");
      expect(assessment.score).to.equal(4);
      expect(assessment.markdown).to.equal("This is a test assessment");

      // Verify it's actually in the database
      const dbAssessment = await db.LandmarkAssessment.findOne({
        where: {
          userId: testUser.id,
          landmark: "Test Landmark",
        },
        transaction,
      });

      expect(dbAssessment).to.not.be.null;
      expect(dbAssessment?.score).to.equal(4);
    });
  });

  describe("listLandmarkAssessmentsImpl", () => {
    it("should list landmark assessments and assert on returned fields", async () => {
      const landmarkName = "Retrieval Landmark";

      // Create a self-evaluation
      await db.LandmarkAssessment.create(
        {
          userId: testUser.id,
          landmark: landmarkName,
          score: 3,
          markdown: "Self evaluation",
        },
        { transaction },
      );

      // Create an evaluation by an assessor
      await db.LandmarkAssessment.create(
        {
          userId: testUser.id,
          assessorId: testAssessor.id,
          landmark: landmarkName,
          score: 4,
          markdown: "Assessor evaluation",
        },
        { transaction },
      );

      const assessments = await listLandmarkAssessmentsImpl(
        { userId: testUser.id, landmark: landmarkName },
        transaction,
      );

      expect(assessments.length).to.equal(2);

      // Verify the required fields based on attributes/includes are present
      // and internal fields are omitted/not asserted on.

      const selfAssessment = assessments.find((a) => !a.assessor);
      expect(selfAssessment).to.not.be.undefined;
      expect(selfAssessment?.score).to.equal(3);
      expect(selfAssessment?.markdown).to.equal("Self evaluation");

      const assessorAssessment = assessments.find((a) => a.assessor);
      expect(assessorAssessment).to.not.be.undefined;
      expect(assessorAssessment?.score).to.equal(4);
      expect(assessorAssessment?.markdown).to.equal("Assessor evaluation");
      expect(assessorAssessment?.assessor?.id).to.equal(testAssessor.id);
      expect(assessorAssessment?.assessor?.name).to.equal("Test Assessor");
    });
  });
});
