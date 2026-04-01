import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  listImpl,
  updateLastImpl,
  getLastMatchFeedback,
} from "./matchFeedback";

describe("MatchFeedback Router", () => {
  let transaction: Transaction;
  let user1: any;
  let user2: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    user1 = await db.User.create(
      {
        email: "user1@example.com",
        name: "User 1",
        roles: [],
      },
      { transaction },
    );
    user2 = await db.User.create(
      {
        email: "user2@example.com",
        name: "User 2",
        roles: [],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
    }
  });

  describe("listImpl", () => {
    it("should return an empty list when the user has no feedback", async () => {
      const result = await listImpl(user1.id, transaction);
      expect(result).to.deep.equal([]);
    });

    it("should return mentee feedback with populated user info", async () => {
      const feedbackData = {
        type: "Mentee",
        mentors: [{ id: user2.id, score: 5, reason: "Great mentor!" }],
      };

      await db.MatchFeedback.create(
        { userId: user1.id, feedback: feedbackData },
        { transaction },
      );

      const result = await listImpl(user1.id, transaction);
      expect(result).to.have.lengthOf(1);
      expect(result[0].feedback.type).to.equal("Mentee");

      const mentors = (result[0].feedback as any).mentors;
      expect(mentors).to.have.lengthOf(1);
      expect(mentors[0].id).to.equal(user2.id);
      void expect(mentors[0].user).to.exist;
      expect(mentors[0].user.name).to.equal("User 2");
    });

    it("should return mentor feedback with populated user info", async () => {
      const feedbackData = {
        type: "Mentor",
        mentees: [{ id: user2.id, choice: "Prefer", reason: "Great mentee!" }],
      };

      await db.MatchFeedback.create(
        { userId: user1.id, feedback: feedbackData },
        { transaction },
      );

      const result = await listImpl(user1.id, transaction);
      expect(result).to.have.lengthOf(1);
      expect(result[0].feedback.type).to.equal("Mentor");

      const mentees = (result[0].feedback as any).mentees;
      expect(mentees).to.have.lengthOf(1);
      expect(mentees[0].id).to.equal(user2.id);
      void expect(mentees[0].user).to.exist;
      expect(mentees[0].user.name).to.equal("User 2");
    });
  });

  describe("updateLastImpl", () => {
    it("should update the latest feedback record", async () => {
      const initialFeedback = {
        type: "Mentee",
        mentors: [{ id: user2.id, score: 3 }],
      };

      await db.MatchFeedback.create(
        { userId: user1.id, feedback: initialFeedback },
        { transaction },
      );

      const newFeedback = {
        type: "Mentee",
        mentors: [{ id: user2.id, score: 5, reason: "Updated reason" }],
      } as any;

      await updateLastImpl(user1.id, newFeedback, transaction);

      const result = await listImpl(user1.id, transaction);
      expect(result).to.have.lengthOf(1);
      const mentors = (result[0].feedback as any).mentors;
      expect(mentors[0].score).to.equal(5);
      expect(mentors[0].reason).to.equal("Updated reason");
    });

    it("should throw an error if no feedback record exists", async () => {
      const newFeedback = {
        type: "Mentee",
        mentors: [{ id: user2.id, score: 5 }],
      } as any;

      try {
        await updateLastImpl(user1.id, newFeedback, transaction);
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.equal("没有找到反馈记录");
      }
    });
  });

  describe("getLastMatchFeedback", () => {
    it("should return null if there is no matching record", async () => {
      const result = await getLastMatchFeedback(
        user1.id,
        "Mentee",
        transaction,
      );
      void expect(result).to.be.null;
    });

    it("should return null if the record type does not match", async () => {
      const feedbackData = {
        type: "Mentee",
        mentors: [{ id: user2.id, score: 5 }],
      };

      await db.MatchFeedback.create(
        { userId: user1.id, feedback: feedbackData },
        { transaction },
      );

      const result = await getLastMatchFeedback(
        user1.id,
        "Mentor",
        transaction,
      );
      void expect(result).to.be.null;
    });

    it("should return the latest record of the specified type", async () => {
      const oldFeedbackData = {
        type: "Mentee",
        mentors: [{ id: user2.id, score: 3 }],
      };

      const newFeedbackData = {
        type: "Mentee",
        mentors: [{ id: user2.id, score: 5, reason: "Latest" }],
      };

      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: oldFeedbackData,
          createdAt: new Date(Date.now() - 10000),
        },
        { transaction },
      );

      await db.MatchFeedback.create(
        { userId: user1.id, feedback: newFeedbackData, createdAt: new Date() },
        { transaction },
      );

      const result = await getLastMatchFeedback(
        user1.id,
        "Mentee",
        transaction,
      );
      void expect(result).to.not.be.null;
      if (result && result.type === "Mentee") {
        expect(result.mentors[0].score).to.equal(5);
        expect(result.mentors[0].reason).to.equal("Latest");
      }
    });
  });
});
