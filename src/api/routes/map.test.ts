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
        email: `user1-${Date.now()}@example.com`,
        name: "Test User 1",
        roles: [],
      },
      { transaction },
    );

    user2 = await db.User.create(
      {
        email: `user2-${Date.now()}@example.com`,
        name: "Test User 2",
        roles: [],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch {
        // Ignore error
      }
    }
  });

  describe("createLandmarkAssessmentImpl & listLandmarkAssessmentsImpl", () => {
    it("should create and list landmark assessments", async () => {
      await createLandmarkAssessmentImpl(
        {
          userId: user1.id,
          landmark: "TestLandmark1",
          score: 3,
          markdown: "Great place!",
        },
        transaction,
      );

      await createLandmarkAssessmentImpl(
        {
          userId: user1.id,
          landmark: "TestLandmark1",
          score: 4,
          markdown: "Visited again, still great.",
        },
        transaction,
      );

      await createLandmarkAssessmentImpl(
        {
          userId: user2.id,
          landmark: "TestLandmark1",
          score: 2,
          markdown: "It's okay.",
        },
        transaction,
      );

      const assessments = await listLandmarkAssessmentsImpl(
        user1.id,
        "TestLandmark1",
        transaction,
      );

      expect(assessments.length).to.equal(2);

      const scores = assessments.map((a) => a.score).sort();
      expect(scores[0]).to.equal(3);
      expect(scores[1]).to.equal(4);

      const markdowns = assessments.map((a) => a.markdown).sort();
      expect(markdowns[0]).to.equal("Great place!");
      expect(markdowns[1]).to.equal("Visited again, still great.");
    });

    it("should return empty array if no assessments match", async () => {
      const assessments = await listLandmarkAssessmentsImpl(
        user1.id,
        "NonExistentLandmark",
        transaction,
      );

      expect(assessments.length).to.equal(0);
    });
  });
});
