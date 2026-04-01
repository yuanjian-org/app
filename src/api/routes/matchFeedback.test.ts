import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { getLastMatchFeedback } from "./matchFeedback";
import { MenteeMatchFeedback, MentorMatchFeedback } from "shared/MatchFeedback";

describe("matchFeedback routes", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("getLastMatchFeedback", () => {
    it("should return the latest MenteeMatchFeedback for a user", async () => {
      const user = await db.User.create(
        {
          email: `mentee-${Date.now()}@example.com`,
          name: "Test Mentee",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );

      const mentor1 = await db.User.create(
        {
          email: `mentor1-${Date.now()}@example.com`,
          name: "M1",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );
      const mentor2 = await db.User.create(
        {
          email: `mentor2-${Date.now()}@example.com`,
          name: "M2",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );

      const feedback1: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor1.id, score: 5, reason: "Great" }],
      };

      const feedback2: MenteeMatchFeedback = {
        type: "Mentee",
        mentors: [{ id: mentor2.id, score: 4, reason: "Good" }],
      };

      const f1 = await db.MatchFeedback.create(
        { userId: user.id, feedback: feedback1 },
        { transaction },
      );

      const f2 = await db.MatchFeedback.create(
        { userId: user.id, feedback: feedback2 },
        { transaction },
      );

      // Update created at to ensure ordering
      await f1.update(
        { createdAt: new Date(Date.now() - 1000) },
        { transaction },
      );
      await f2.update({ createdAt: new Date() }, { transaction });

      const result = await getLastMatchFeedback(user.id, "Mentee", transaction);

      expect(result).not.to.equal(null);
      expect(result?.type).to.equal("Mentee");
      if (result?.type === "Mentee") {
        expect(result.mentors[0].id).to.equal(mentor2.id);
      }
    });

    it("should return the latest MentorMatchFeedback for a user", async () => {
      const user = await db.User.create(
        {
          email: `mentor-${Date.now()}@example.com`,
          name: "Test Mentor",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );

      const mentee1 = await db.User.create(
        {
          email: `mentee1-${Date.now()}@example.com`,
          name: "M1",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );
      const mentee2 = await db.User.create(
        {
          email: `mentee2-${Date.now()}@example.com`,
          name: "M2",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );

      const feedback1: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee1.id, choice: "Prefer", reason: "Smart" }],
      };

      const feedback2: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee2.id, choice: "Avoid", reason: "Mismatch" }],
      };

      const f1 = await db.MatchFeedback.create(
        { userId: user.id, feedback: feedback1 },
        { transaction },
      );

      const f2 = await db.MatchFeedback.create(
        { userId: user.id, feedback: feedback2 },
        { transaction },
      );

      // Update created at to ensure ordering
      await f1.update(
        { createdAt: new Date(Date.now() - 1000) },
        { transaction },
      );
      await f2.update({ createdAt: new Date() }, { transaction });

      const result = await getLastMatchFeedback(user.id, "Mentor", transaction);

      expect(result).not.to.equal(null);
      expect(result?.type).to.equal("Mentor");
      if (result?.type === "Mentor") {
        expect(result.mentees[0].id).to.equal(mentee2.id);
      }
    });

    it("should return null if no feedback exists", async () => {
      const user = await db.User.create(
        {
          email: `user-${Date.now()}@example.com`,
          name: "Test User",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );

      const result = await getLastMatchFeedback(user.id, "Mentee", transaction);
      expect(result).to.equal(null);
    });

    it("should return null if the type does not match", async () => {
      const user = await db.User.create(
        {
          email: `mentor-${Date.now()}@example.com`,
          name: "Test Mentor",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );

      const mentee1 = await db.User.create(
        {
          email: `mentee1-${Date.now()}@example.com`,
          name: "M1",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );

      const feedback: MentorMatchFeedback = {
        type: "Mentor",
        mentees: [{ id: mentee1.id, choice: "Prefer", reason: "Smart" }],
      };

      await db.MatchFeedback.create(
        { userId: user.id, feedback: feedback },
        { transaction },
      );

      const result = await getLastMatchFeedback(user.id, "Mentee", transaction);

      expect(result).to.equal(null);
    });
  });
});
