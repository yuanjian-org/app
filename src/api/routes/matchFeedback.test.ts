import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { listImpl, updateLastImpl, getLastMatchFeedback } from "./matchFeedback";

describe("matchFeedback routes", () => {
  let transaction: Transaction;
  let user1: any;
  let mentor1: any;
  let mentee1: any;

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

    mentor1 = await db.User.create(
      {
        email: `mentor1-${Date.now()}@example.com`,
        name: "Test Mentor 1",
        roles: ["Mentor"],
      },
      { transaction },
    );

    mentee1 = await db.User.create(
      {
        email: `mentee1-${Date.now()}@example.com`,
        name: "Test Mentee 1",
        roles: ["Mentee"],
      },
      { transaction },
    );

  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("listImpl", () => {
    it("should return the correct list of feedbacks for mentees and mentors", async () => {
      // Create mentee feedback
      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: {
            type: "Mentee",
            mentors: [
              {
                id: mentor1.id,
                score: 5,
                reason: "Great mentor",
              },
            ],
          },
        },
        { transaction },
      );

      // Create mentor feedback
      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: {
            type: "Mentor",
            mentees: [
              {
                id: mentee1.id,
                choice: "Prefer",
                reason: "Good mentee",
              },
            ],
          },
        },
        { transaction },
      );

      const feedbacks = await listImpl(user1.id, transaction);
      expect(feedbacks).to.have.lengthOf(2);

      const menteeFeedback = feedbacks.find((f) => f.feedback.type === "Mentee");
      expect(menteeFeedback).to.not.be.undefined;
      if (menteeFeedback && menteeFeedback.feedback.type === "Mentee") {
        expect(menteeFeedback.feedback.mentors).to.have.lengthOf(1);
        expect(menteeFeedback.feedback.mentors[0].id).to.equal(mentor1.id);
        expect(menteeFeedback.feedback.mentors[0].user?.id).to.equal(mentor1.id);
      }

      const mentorFeedback = feedbacks.find((f) => f.feedback.type === "Mentor");
      expect(mentorFeedback).to.not.be.undefined;
      if (mentorFeedback && mentorFeedback.feedback.type === "Mentor") {
        expect(mentorFeedback.feedback.mentees).to.have.lengthOf(1);
        expect(mentorFeedback.feedback.mentees[0].id).to.equal(mentee1.id);
        expect(mentorFeedback.feedback.mentees[0].user?.id).to.equal(mentee1.id);
      }
    });
  });

  describe("updateLastImpl", () => {
    it("should update the last feedback correctly", async () => {
      // Create mentee feedback
      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: {
            type: "Mentee",
            mentors: [
              {
                id: mentor1.id,
                score: 5,
                reason: "Great mentor",
              },
            ],
          },
        },
        { transaction },
      );

      await updateLastImpl(
        user1.id,
        {
          type: "Mentee",
          mentors: [
            {
              id: mentor1.id,
              score: 3,
              reason: "Okay mentor",
            },
          ],
        },
        transaction,
      );

      const feedbacks = await listImpl(user1.id, transaction);
      expect(feedbacks).to.have.lengthOf(1);

      const menteeFeedback = feedbacks.find((f) => f.feedback.type === "Mentee");
      expect(menteeFeedback).to.not.be.undefined;
      if (menteeFeedback && menteeFeedback.feedback.type === "Mentee") {
        expect(menteeFeedback.feedback.mentors).to.have.lengthOf(1);
        expect(menteeFeedback.feedback.mentors[0].id).to.equal(mentor1.id);
        expect(menteeFeedback.feedback.mentors[0].score).to.equal(3);
        expect(menteeFeedback.feedback.mentors[0].reason).to.equal("Okay mentor");
      }
    });
  });

  describe("getLastMatchFeedback", () => {
    it("should return the correct last feedback for mentees and mentors", async () => {
      // Create first mentee feedback
      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: {
            type: "Mentee",
            mentors: [
              {
                id: mentor1.id,
                score: 5,
                reason: "Great mentor",
              },
            ],
          },
        },
        { transaction },
      );

      // Create second mentee feedback
      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: {
            type: "Mentee",
            mentors: [
              {
                id: mentor1.id,
                score: 3,
                reason: "Okay mentor",
              },
            ],
          },
        },
        { transaction },
      );

      const lastMenteeFeedback = await getLastMatchFeedback(user1.id, "Mentee", transaction);
      expect(lastMenteeFeedback).to.not.be.null;
      if (lastMenteeFeedback && lastMenteeFeedback.type === "Mentee") {
        expect(lastMenteeFeedback.mentors).to.have.lengthOf(1);
        expect(lastMenteeFeedback.mentors[0].score).to.equal(3);
      }
    });
  });

});
