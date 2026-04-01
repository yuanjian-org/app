import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  listImpl,
  updateLastImpl,
  getLastMatchFeedback,
} from "./matchFeedback";
import { MatchFeedback } from "shared/MatchFeedback";

describe("matchFeedback", () => {
  let transaction: Transaction;
  let meMentee: any;
  let meMentor: any;
  let mentor1: any;
  let mentee1: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    meMentee = await db.User.create(
      {
        email: `mentee-${Date.now()}-${Math.random()}@example.com`,
        name: "Test Mentee",
        roles: ["Mentee"],
      },
      { transaction },
    );

    meMentor = await db.User.create(
      {
        email: `mentor-${Date.now()}-${Math.random()}@example.com`,
        name: "Test Mentor",
        roles: ["Mentor"],
      },
      { transaction },
    );

    mentor1 = await db.User.create(
      {
        email: `mentor1-${Date.now()}-${Math.random()}@example.com`,
        name: "Mentor 1",
        roles: ["Mentor"],
      },
      { transaction },
    );

    mentee1 = await db.User.create(
      {
        email: `mentee1-${Date.now()}-${Math.random()}@example.com`,
        name: "Mentee 1",
        roles: ["Mentee"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("listImpl", () => {
    it("should return empty list if no feedbacks", async () => {
      const result = await listImpl(meMentee.id, transaction);
      expect(result).to.deep.equal([]);
    });

    it("should return mentee match feedbacks", async () => {
      const feedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 5,
            reason: "Great mentor",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: meMentee.id,
          feedback,
        },
        { transaction },
      );

      const result = await listImpl(meMentee.id, transaction);
      expect(result).to.have.lengthOf(1);
      expect(result[0].feedback.type).to.equal("Mentee");

      const menteeFeedback = result[0].feedback as any;
      expect(menteeFeedback.mentors).to.have.lengthOf(1);
      expect(menteeFeedback.mentors[0].id).to.equal(mentor1.id);
      expect(menteeFeedback.mentors[0].user.name).to.equal("Mentor 1");
    });

    it("should return mentor match feedbacks", async () => {
      const feedback: MatchFeedback = {
        type: "Mentor",
        mentees: [
          {
            id: mentee1.id,
            choice: "Prefer",
            reason: "Great mentee",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: meMentor.id,
          feedback,
        },
        { transaction },
      );

      const result = await listImpl(meMentor.id, transaction);
      expect(result).to.have.lengthOf(1);
      expect(result[0].feedback.type).to.equal("Mentor");

      const mentorFeedback = result[0].feedback as any;
      expect(mentorFeedback.mentees).to.have.lengthOf(1);
      expect(mentorFeedback.mentees[0].id).to.equal(mentee1.id);
      expect(mentorFeedback.mentees[0].user.name).to.equal("Mentee 1");
    });
  });

  describe("updateLastImpl", () => {
    it("should update the last feedback successfully", async () => {
      const initialFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 3,
            reason: "Okay mentor",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: meMentee.id,
          feedback: initialFeedback,
        },
        { transaction },
      );

      const newFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 5,
            reason: "Awesome mentor",
          },
        ],
      };

      await updateLastImpl(meMentee.id, newFeedback, transaction);

      const result = await listImpl(meMentee.id, transaction);
      expect(result).to.have.lengthOf(1);

      const menteeFeedback = result[0].feedback as any;
      expect(menteeFeedback.mentors[0].score).to.equal(5);
      expect(menteeFeedback.mentors[0].reason).to.equal("Awesome mentor");
    });

    it("should throw error if no feedback found", async () => {
      const newFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [],
      };

      try {
        await updateLastImpl(meMentee.id, newFeedback, transaction);
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err.message).to.equal("没有找到反馈记录");
      }
    });
  });

  describe("getLastMatchFeedback", () => {
    it("should return null if no feedback", async () => {
      const result = await getLastMatchFeedback(meMentee.id, "Mentee", transaction);
      void expect(result).to.be.null;
    });

    it("should return the latest feedback of the specified type", async () => {
      const olderFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 3,
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: meMentee.id,
          feedback: olderFeedback,
        },
        { transaction },
      );

      // Ensure slight time difference for ordering
      await new Promise(resolve => setTimeout(resolve, 10));

      const newerFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 5,
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: meMentee.id,
          feedback: newerFeedback,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(meMentee.id, "Mentee", transaction);
      expect(result).to.not.be.null;

      const menteeFeedback = result as any;
      expect(menteeFeedback.mentors[0].score).to.equal(5);
    });

    it("should return null if the last feedback is of different type", async () => {
      const feedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 5,
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: meMentee.id,
          feedback,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(meMentee.id, "Mentor", transaction);
      void expect(result).to.be.null;
    });
  });
});
