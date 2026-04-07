import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { listImpl, updateLastImpl, getLastMatchFeedback } from "./matchFeedback";
import { MenteeMatchFeedback, MentorMatchFeedback } from "shared/MatchFeedback";
import { v4 as uuidv4 } from "uuid";

describe("matchFeedback routes", () => {
  let transaction: Transaction;
  let user1: any;
  let mentee1: any;
  let mentee2: any;
  let mentor1: any;
  let mentor2: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    user1 = await db.User.create(
      {
        id: uuidv4(),
        email: `user1-${Date.now()}@example.com`,
        name: "Test User 1",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    mentee1 = await db.User.create(
      {
        id: uuidv4(),
        email: `mentee1-${Date.now()}@example.com`,
        name: "Test Mentee 1",
        roles: ["Mentee"],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    mentee2 = await db.User.create(
      {
        id: uuidv4(),
        email: `mentee2-${Date.now()}@example.com`,
        name: "Test Mentee 2",
        roles: ["Mentee"],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    mentor1 = await db.User.create(
      {
        id: uuidv4(),
        email: `mentor1-${Date.now()}@example.com`,
        name: "Test Mentor 1",
        roles: ["Mentor"],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    mentor2 = await db.User.create(
      {
        id: uuidv4(),
        email: `mentor2-${Date.now()}@example.com`,
        name: "Test Mentor 2",
        roles: ["Mentor"],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("listImpl", () => {
    it("should list match feedbacks for a user", async () => {
      const feedback1: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 5,
            reason: "Great",
          },
        ],
      };

      const feedback2: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [
          {
            id: mentee1.id,
            choice: "Prefer",
            reason: "Good fit",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: feedback1,
        },
        { transaction },
      );

      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: feedback2,
        },
        { transaction },
      );

      const result = await listImpl(user1.id, transaction);

      expect(result.length).to.equal(2);

      const menteeFeedbackResult = result.find(r => r.feedback.type === "Mentee");
      expect(menteeFeedbackResult).to.not.be.undefined;
      if (menteeFeedbackResult && menteeFeedbackResult.feedback.type === "Mentee") {
         expect(menteeFeedbackResult.feedback.mentors[0].user?.id).to.equal(mentor1.id);
      }

      const mentorFeedbackResult = result.find(r => r.feedback.type === "Mentor");
      expect(mentorFeedbackResult).to.not.be.undefined;
      if (mentorFeedbackResult && mentorFeedbackResult.feedback.type === "Mentor") {
         expect(mentorFeedbackResult.feedback.mentees[0].user?.id).to.equal(mentee1.id);
      }
    });
  });

  describe("updateLastImpl", () => {
    it("should update the last feedback for a user", async () => {
       const initialFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 5,
            reason: "Great",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback: initialFeedback,
        },
        { transaction },
      );

      const updatedFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 4,
            reason: "Good",
          },
        ],
      };

      await updateLastImpl(user1.id, updatedFeedback, transaction);

      const last = await db.MatchFeedback.findOne({
        where: { userId: user1.id },
        order: [["createdAt", "DESC"]],
        transaction,
      });

      expect(last).to.not.be.null;
      if (last) {
        expect(last.feedback.type).to.equal("Mentee");
        if (last.feedback.type === "Mentee") {
           expect(last.feedback.mentors[0].score).to.equal(4);
           expect(last.feedback.mentors[0].reason).to.equal("Good");
        }
      }
    });

    it("should throw an error if no feedback exists", async () => {
      let threwError = false;
      try {
        const feedback: MenteeMatchFeedback = {
          type: "Mentee",
          mentors: [
            {
              id: mentor1.id,
              score: 5,
              reason: "Great",
            },
          ],
        };
        await updateLastImpl(user1.id, feedback, transaction);
      } catch (e: any) {
        threwError = true;
        expect(e.message).to.equal("没有找到反馈记录");
      }
      expect(threwError).to.be.true;
    });
  });

  describe("getLastMatchFeedback", () => {
    it("should return the last mentee feedback", async () => {
       const feedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor1.id,
            score: 5,
            reason: "Great",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(user1.id, "Mentee", transaction);
      expect(result).to.not.be.null;
      if (result) {
        expect(result.type).to.equal("Mentee");
      }
    });

    it("should return the last mentor feedback", async () => {
      const feedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [
          {
            id: mentee1.id,
            choice: "Prefer",
            reason: "Good fit",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(user1.id, "Mentor", transaction);
      expect(result).to.not.be.null;
      if (result) {
        expect(result.type).to.equal("Mentor");
      }
    });

    it("should return null if the last feedback is of a different type", async () => {
      const feedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [
          {
            id: mentee1.id,
            choice: "Prefer",
            reason: "Good fit",
          },
        ],
      };

      await db.MatchFeedback.create(
        {
          userId: user1.id,
          feedback,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(user1.id, "Mentee", transaction);
      expect(result).to.be.null;
    });

    it("should return null if no feedback exists", async () => {
      const result = await getLastMatchFeedback(user1.id, "Mentee", transaction);
      expect(result).to.be.null;
    });
  });
});
