import { expect } from "chai";
import db from "api/database/db";
import sequelize from "api/database/sequelize";
import { Transaction } from "sequelize";
import { getLastMatchFeedback } from "./matchFeedback";
import { v4 as uuidv4 } from "uuid";
import { MenteeMatchFeedback, MentorMatchFeedback } from "shared/MatchFeedback";

describe("matchFeedback routes", () => {
  let transaction: Transaction;
  let mentee: any;
  let mentor: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    mentee = await db.User.create(
      {
        id: uuidv4(),
        email: `mentee-${Date.now()}@example.com`,
        name: "Test Mentee",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    mentor = await db.User.create(
      {
        id: uuidv4(),
        email: `mentor-${Date.now()}@example.com`,
        name: "Test Mentor",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("getLastMatchFeedback", () => {
    it("should return the latest mentee match feedback", async () => {
      const feedback1: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor.id, score: 3, reason: "Reason 1" }],
      };
      await db.MatchFeedback.create(
        {
          userId: mentee.id,
          feedback: feedback1,
          createdAt: new Date("2023-01-01T00:00:00Z"),
        },
        { transaction },
      );

      const feedback2: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor.id, score: 5, reason: "Reason 2" }],
      };
      await db.MatchFeedback.create(
        {
          userId: mentee.id,
          feedback: feedback2,
          createdAt: new Date("2023-01-02T00:00:00Z"),
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(
        mentee.id,
        "Mentee",
        transaction,
      );
      expect(result).to.not.equal(null);
      expect(result?.type).to.equal("Mentee");
      if (result?.type === "Mentee") {
        expect(result.mentors[0].score).to.equal(5);
        expect(result.mentors[0].reason).to.equal("Reason 2");
      }
    });

    it("should return the latest mentor match feedback", async () => {
      const feedback1: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee.id, choice: "Neutral", reason: "Reason 1" }],
      };
      await db.MatchFeedback.create(
        {
          userId: mentor.id,
          feedback: feedback1,
          createdAt: new Date("2023-01-01T00:00:00Z"),
        },
        { transaction },
      );

      const feedback2: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee.id, choice: "Prefer", reason: "Reason 2" }],
      };
      await db.MatchFeedback.create(
        {
          userId: mentor.id,
          feedback: feedback2,
          createdAt: new Date("2023-01-02T00:00:00Z"),
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(
        mentor.id,
        "Mentor",
        transaction,
      );
      expect(result).to.not.equal(null);
      expect(result?.type).to.equal("Mentor");
      if (result?.type === "Mentor") {
        expect(result.mentees[0].choice).to.equal("Prefer");
        expect(result.mentees[0].reason).to.equal("Reason 2");
      }
    });

    it("should return null if there is no feedback", async () => {
      const result = await getLastMatchFeedback(
        mentee.id,
        "Mentee",
        transaction,
      );
      expect(result).to.equal(null);
    });

    it("should return null if the latest feedback type does not match the requested type", async () => {
      const feedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee.id, choice: "Prefer", reason: "Reason" }],
      };
      await db.MatchFeedback.create(
        {
          userId: mentee.id, // Creating Mentor feedback for a Mentee ID (for test purpose)
          feedback: feedback,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(
        mentee.id,
        "Mentee",
        transaction,
      );
      expect(result).to.equal(null);
    });
  });
});
