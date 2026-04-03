import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  listImpl,
  updateLastImpl,
  getLastMatchFeedback,
} from "./matchFeedback";
import { MenteeMatchFeedback, MentorMatchFeedback } from "shared/MatchFeedback";
import moment from "moment";

describe("matchFeedback routes", () => {
  let transaction: Transaction;
  let mentee: any;
  let mentor1: any;
  let mentor2: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    mentee = await db.User.create(
      {
        email: `mentee-${Date.now()}@test.com`,
        name: "Test Mentee",
        roles: ["Mentee"],
      },
      { transaction },
    );

    mentor1 = await db.User.create(
      {
        email: `mentor1-${Date.now()}@test.com`,
        name: "Test Mentor 1",
        roles: ["Mentor"],
      },
      { transaction },
    );

    mentor2 = await db.User.create(
      {
        email: `mentor2-${Date.now()}@test.com`,
        name: "Test Mentor 2",
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

  describe("listImpl", () => {
    it("should list mentee match feedbacks with user data populated", async () => {
      const feedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [
          { id: mentor1.id, score: 5, reason: "Great mentor" },
          { id: mentor2.id, score: 4, reason: "Good fit" },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: mentee.id,
          feedback,
        },
        { transaction },
      );

      const results = await listImpl(mentee.id, transaction);
      expect(results.length).to.equal(1);
      const resFeedback = results[0].feedback as MenteeMatchFeedback;
      expect(resFeedback.type).to.equal("Mentee");
      expect(resFeedback.mentors.length).to.equal(2);
      expect(resFeedback.mentors[0].user?.name).to.equal("Test Mentor 1");
      expect(resFeedback.mentors[1].user?.name).to.equal("Test Mentor 2");
    });

    it("should list mentor match feedbacks with user data populated", async () => {
      const feedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee.id, choice: "Prefer", reason: "Good match" }],
      };

      await db.MatchFeedback.create(
        {
          userId: mentor1.id,
          feedback,
        },
        { transaction },
      );

      const results = await listImpl(mentor1.id, transaction);
      expect(results.length).to.equal(1);
      const resFeedback = results[0].feedback as MentorMatchFeedback;
      expect(resFeedback.type).to.equal("Mentor");
      expect(resFeedback.mentees.length).to.equal(1);
      expect(resFeedback.mentees[0].user?.name).to.equal("Test Mentee");
    });
  });

  describe("updateLastImpl", () => {
    it("should update the most recent match feedback for a user", async () => {
      const oldFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor1.id, score: 4 }],
      };

      await db.MatchFeedback.create(
        {
          userId: mentee.id,
          feedback: oldFeedback,
          createdAt: moment().subtract(1, "days").toDate(),
        },
        { transaction },
      );

      const recentFeedbackRecord = await db.MatchFeedback.create(
        {
          userId: mentee.id,
          feedback: oldFeedback,
          createdAt: new Date(),
        },
        { transaction },
      );

      const newFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor1.id, score: 5, reason: "Updated score" }],
      };

      await updateLastImpl(mentee.id, newFeedback, transaction);

      const updatedRecent = await db.MatchFeedback.findByPk(
        recentFeedbackRecord.id,
        { transaction },
      );
      expect(updatedRecent?.feedback).to.deep.equal(newFeedback);

      const allFeedbacks = await db.MatchFeedback.findAll({
        where: { userId: mentee.id },
        order: [["createdAt", "ASC"]],
        transaction,
      });

      // Old feedback should remain unchanged
      expect(allFeedbacks[0].feedback).to.deep.equal(oldFeedback);
      expect(allFeedbacks[1].feedback).to.deep.equal(newFeedback);
    });

    it("should throw generalBadRequestError if no feedback exists", async () => {
      let errorThrown = false;
      try {
        await updateLastImpl(
          mentee.id,
          { type: "Mentee", mentors: [] },
          transaction,
        );
      } catch (e: any) {
        errorThrown = true;
        expect(e.message).to.equal("没有找到反馈记录");
      }
      void expect(errorThrown).to.be.true;
    });
  });

  describe("getLastMatchFeedback", () => {
    it("should return the latest match feedback of the correct type", async () => {
      const firstFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor1.id, score: 3 }],
      };

      const secondFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor1.id, score: 5 }],
      };

      await db.MatchFeedback.create(
        {
          userId: mentee.id,
          feedback: firstFeedback,
          createdAt: moment().subtract(2, "days").toDate(),
        },
        { transaction },
      );

      await db.MatchFeedback.create(
        {
          userId: mentee.id,
          feedback: secondFeedback,
          createdAt: moment().subtract(1, "days").toDate(),
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(
        mentee.id,
        "Mentee",
        transaction,
      );
      expect(result).to.deep.equal(secondFeedback);
    });

    it("should return null if no feedback of the specified type exists", async () => {
      const feedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee.id }],
      };

      await db.MatchFeedback.create(
        {
          userId: mentor1.id,
          feedback,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(
        mentor1.id,
        "Mentee",
        transaction,
      );
      void expect(result).to.be.null;
    });

    it("should return null if user has no feedbacks", async () => {
      const result = await getLastMatchFeedback(
        mentee.id,
        "Mentee",
        transaction,
      );
      void expect(result).to.be.null;
    });
  });
});
