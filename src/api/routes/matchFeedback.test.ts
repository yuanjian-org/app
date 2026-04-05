import { expect } from "chai";
import db from "api/database/db";
import sequelize from "api/database/sequelize";
import { Transaction } from "sequelize";
import { getLastMatchFeedback, updateLastImpl } from "./matchFeedback";
import { MenteeMatchFeedback, MentorMatchFeedback } from "shared/MatchFeedback";

describe("matchFeedback routes", () => {
  let transaction: Transaction;
  let mentee: any;
  let mentor: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    mentee = await db.User.create(
      {
        email: `mentee-${Date.now()}-${Math.random()}@example.com`,
        name: "Mentee User",
        roles: ["Volunteer"],
      },
      { transaction },
    );

    mentor = await db.User.create(
      {
        email: `mentor-${Date.now()}-${Math.random()}@example.com`,
        name: "Mentor User",
        roles: ["Mentor"],
      },
      { transaction },
    );

    const menteeFeedback: MenteeMatchFeedback = {
      type: "Mentee",
      mentors: [
        {
          id: mentor.id,
          score: 5,
          reason: "Great mentor",
        },
      ],
    };

    const mentorFeedback: MentorMatchFeedback = {
      type: "Mentor",
      mentees: [
        {
          id: mentee.id,
          choice: "Prefer",
          reason: "Great mentee",
        },
      ],
    };

    await db.MatchFeedback.create(
      {
        userId: mentee.id,
        feedback: menteeFeedback,
      },
      { transaction },
    );

    // Simulate an older record to ensure it takes the latest one
    await db.MatchFeedback.create(
      {
        userId: mentee.id,
        feedback: {
          type: "Mentee",
          mentors: [],
        },
        createdAt: new Date(Date.now() - 10000), // Older record
      },
      { transaction },
    );

    await db.MatchFeedback.create(
      {
        userId: mentor.id,
        feedback: mentorFeedback,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("getLastMatchFeedback", () => {
    it("should return the latest Mentee match feedback", async () => {
      const feedback = await getLastMatchFeedback(
        mentee.id,
        "Mentee",
        transaction,
      );
      expect(feedback).not.to.equal(null);
      if (feedback && feedback.type === "Mentee") {
        expect(feedback.mentors).to.have.lengthOf(1);
        expect(feedback.mentors[0].id).to.equal(mentor.id);
        expect(feedback.mentors[0].score).to.equal(5);
        expect(feedback.mentors[0].reason).to.equal("Great mentor");
      } else {
        expect.fail("Expected MenteeMatchFeedback");
      }
    });

    it("should return the latest Mentor match feedback", async () => {
      const feedback = await getLastMatchFeedback(
        mentor.id,
        "Mentor",
        transaction,
      );
      expect(feedback).not.to.equal(null);
      if (feedback && feedback.type === "Mentor") {
        expect(feedback.mentees).to.have.lengthOf(1);
        expect(feedback.mentees[0].id).to.equal(mentee.id);
        expect(feedback.mentees[0].choice).to.equal("Prefer");
        expect(feedback.mentees[0].reason).to.equal("Great mentee");
      } else {
        expect.fail("Expected MentorMatchFeedback");
      }
    });

    it("should return null if user has no match feedback", async () => {
      const newUser = await db.User.create(
        {
          email: `newuser-${Date.now()}-${Math.random()}@example.com`,
          name: "New User",
          roles: ["Volunteer"],
        },
        { transaction },
      );
      const feedback = await getLastMatchFeedback(
        newUser.id,
        "Mentee",
        transaction,
      );
      expect(feedback).to.equal(null);
    });

    it("should return null if the type does not match", async () => {
      // Mentee has "Mentee" feedback, asking for "Mentor" feedback should return null
      const feedback = await getLastMatchFeedback(
        mentee.id,
        "Mentor",
        transaction,
      );
      expect(feedback).to.equal(null);
    });
  });

  describe("updateLastImpl", () => {
    it("should successfully update the latest match feedback", async () => {
      const updatedMenteeFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: mentor.id,
            score: 4, // Changed score
            reason: "Updated reason",
          },
        ],
      };

      await updateLastImpl(mentee.id, updatedMenteeFeedback, transaction);

      const feedback = await getLastMatchFeedback(
        mentee.id,
        "Mentee",
        transaction,
      );
      expect(feedback).not.to.equal(null);
      if (feedback && feedback.type === "Mentee") {
        expect(feedback.mentors).to.have.lengthOf(1);
        expect(feedback.mentors[0].score).to.equal(4);
        expect(feedback.mentors[0].reason).to.equal("Updated reason");
      } else {
        expect.fail("Expected MenteeMatchFeedback");
      }
    });

    it("should throw generalBadRequestError if no record to update is found", async () => {
      const newUser = await db.User.create(
        {
          email: `newuser2-${Date.now()}-${Math.random()}@example.com`,
          name: "New User 2",
          roles: ["Volunteer"],
        },
        { transaction },
      );

      const newFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [],
      };

      try {
        await updateLastImpl(newUser.id, newFeedback, transaction);
        expect.fail("Should have thrown generalBadRequestError");
      } catch (e: any) {
        expect(e.message).to.equal("没有找到反馈记录");
      }
    });
  });
});
