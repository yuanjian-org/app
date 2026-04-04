import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import {
  getLastMatchFeedback,
  listImpl,
  updateLastImpl,
} from "./matchFeedback";
import { MenteeMatchFeedback, MentorMatchFeedback } from "shared/MatchFeedback";

describe("matchFeedback routes", () => {
  let transaction: Transaction;
  let menteeUser: any;
  let mentorUser: any;
  let anotherMentorUser: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create a mentee
    menteeUser = await db.User.create(
      {
        email: `mentee-${Date.now()}@example.com`,
        name: "Test Mentee",
        roles: [],
      },
      { transaction },
    );

    // Create a mentor
    mentorUser = await db.User.create(
      {
        email: `mentor-${Date.now()}@example.com`,
        name: "Test Mentor",
        roles: ["Mentor"],
      },
      { transaction },
    );

    // Create another mentor
    anotherMentorUser = await db.User.create(
      {
        email: `mentor-${Date.now()}-2@example.com`,
        name: "Another Mentor",
        roles: ["Mentor"],
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("getLastMatchFeedback", () => {
    it("should return the latest Mentee match feedback", async () => {
      const firstFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentorUser.id, score: 3 }],
      };
      const secondFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentorUser.id, score: 4 }],
      };

      await db.MatchFeedback.create(
        { userId: menteeUser.id, feedback: firstFeedback },
        { transaction },
      );
      // Wait a bit to ensure createdAt difference, or just trust Sequelize autoincrement ordering,
      // but creating sequentially usually puts the last one later or we can manually set createdAt if needed.
      // For precision, let's create it.
      await new Promise((resolve) => setTimeout(resolve, 10));
      await db.MatchFeedback.create(
        { userId: menteeUser.id, feedback: secondFeedback },
        { transaction },
      );

      const latest = await getLastMatchFeedback(
        menteeUser.id,
        "Mentee",
        transaction,
      );
      expect(latest).not.to.equal(null);
      expect((latest as MenteeMatchFeedback).mentors[0].score).to.equal(4);
    });

    it("should return the latest Mentor match feedback", async () => {
      const mentorFeedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: menteeUser.id, choice: "Prefer" }],
      };
      await db.MatchFeedback.create(
        { userId: mentorUser.id, feedback: mentorFeedback },
        { transaction },
      );

      const latest = await getLastMatchFeedback(
        mentorUser.id,
        "Mentor",
        transaction,
      );
      expect(latest).not.to.equal(null);
      expect((latest as MentorMatchFeedback).mentees[0].choice).to.equal(
        "Prefer",
      );
    });

    it("should return null if there is no feedback of the requested type", async () => {
      const latest = await getLastMatchFeedback(
        menteeUser.id,
        "Mentee",
        transaction,
      );
      expect(latest).to.equal(null);
    });

    it("should return null if the latest feedback type does not match", async () => {
      const menteeFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentorUser.id, score: 3 }],
      };
      await db.MatchFeedback.create(
        { userId: menteeUser.id, feedback: menteeFeedback },
        { transaction },
      );

      // Ask for Mentor type for a user that only has Mentee feedback
      const latest = await getLastMatchFeedback(
        menteeUser.id,
        "Mentor",
        transaction,
      );
      expect(latest).to.equal(null);
    });
  });

  describe("listImpl", () => {
    it("should return list of match feedbacks and populate user info for Mentee feedback", async () => {
      const feedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentorUser.id, score: 5, reason: "great" }],
      };
      await db.MatchFeedback.create(
        { userId: menteeUser.id, feedback },
        { transaction },
      );

      const list = await listImpl(menteeUser.id, transaction);
      expect(list.length).to.equal(1);

      const returnedFeedback = list[0].feedback as MenteeMatchFeedback;
      expect(returnedFeedback.type).to.equal("Mentee");
      expect(returnedFeedback.mentors.length).to.equal(1);
      expect(returnedFeedback.mentors[0].user).not.to.equal(undefined);
      expect(returnedFeedback.mentors[0].user?.id).to.equal(mentorUser.id);
      expect(returnedFeedback.mentors[0].user?.name).to.equal("Test Mentor");
    });

    it("should return list of match feedbacks and populate user info for Mentor feedback", async () => {
      const feedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: menteeUser.id, choice: "Prefer" }],
      };
      await db.MatchFeedback.create(
        { userId: mentorUser.id, feedback },
        { transaction },
      );

      const list = await listImpl(mentorUser.id, transaction);
      expect(list.length).to.equal(1);

      const returnedFeedback = list[0].feedback as MentorMatchFeedback;
      expect(returnedFeedback.type).to.equal("Mentor");
      expect(returnedFeedback.mentees.length).to.equal(1);
      expect(returnedFeedback.mentees[0].user).not.to.equal(undefined);
      expect(returnedFeedback.mentees[0].user?.id).to.equal(menteeUser.id);
      expect(returnedFeedback.mentees[0].user?.name).to.equal("Test Mentee");
    });
  });

  describe("updateLastImpl", () => {
    it("should update the latest feedback record", async () => {
      const initialFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentorUser.id, score: 1 }],
      };
      await db.MatchFeedback.create(
        { userId: menteeUser.id, feedback: initialFeedback },
        { transaction },
      );

      const updatedFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [
          { id: mentorUser.id, score: 5 },
          { id: anotherMentorUser.id, score: 4 },
        ],
      };

      await updateLastImpl(menteeUser.id, updatedFeedback, transaction);

      const latest = await getLastMatchFeedback(
        menteeUser.id,
        "Mentee",
        transaction,
      );
      expect(latest).not.to.equal(null);
      const menteeLatest = latest as MenteeMatchFeedback;
      expect(menteeLatest.mentors.length).to.equal(2);
      expect(menteeLatest.mentors[0].score).to.equal(5);
    });

    it("should throw error if no feedback record exists to update", async () => {
      const newFeedback: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentorUser.id, score: 5 }],
      };

      try {
        await updateLastImpl(menteeUser.id, newFeedback, transaction);
        expect.fail("Should have thrown generalBadRequestError");
      } catch (e: any) {
        expect(e.message).to.equal("没有找到反馈记录");
      }
    });
  });
});
