import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { listImpl, updateLastImpl, getLastMatchFeedback } from "./matchFeedback";
import { v4 as uuidv4 } from "uuid";
import { MatchFeedback } from "shared/MatchFeedback";
import { TRPCError } from "@trpc/server";

describe("matchFeedback routes", () => {
  let transaction: Transaction;
  let user1: any;
  let user2: any;
  let user3: any;

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

    user2 = await db.User.create(
      {
        id: uuidv4(),
        email: `user2-${Date.now()}@example.com`,
        name: "Test User 2",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    user3 = await db.User.create(
      {
        id: uuidv4(),
        email: `user3-${Date.now()}@example.com`,
        name: "Test User 3",
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

  describe("listImpl", () => {
    it("should return mentee feedback with user populated", async () => {
      const feedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: user2.id,
            score: 5,
            reason: "Good mentor",
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

      const result = await listImpl(user1.id, transaction);
      expect(result.length).to.equal(1);
      expect(result[0].feedback.type).to.equal("Mentee");
      if (result[0].feedback.type === "Mentee") {
        expect(result[0].feedback.mentors[0].user?.id).to.equal(user2.id);
        expect(result[0].feedback.mentors[0].score).to.equal(5);
      }
    });

    it("should return mentor feedback with user populated", async () => {
      const feedback: MatchFeedback = {
        type: "Mentor",
        mentees: [
          {
            id: user3.id,
            choice: "Prefer",
            reason: "Good mentee",
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

      const result = await listImpl(user1.id, transaction);
      expect(result.length).to.equal(1);
      expect(result[0].feedback.type).to.equal("Mentor");
      if (result[0].feedback.type === "Mentor") {
        expect(result[0].feedback.mentees[0].user?.id).to.equal(user3.id);
        expect(result[0].feedback.mentees[0].choice).to.equal("Prefer");
      }
    });
  });

  describe("updateLastImpl", () => {
    it("should update the last feedback correctly", async () => {
      const initialFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: user2.id,
            score: 4,
            reason: "Good",
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

      const updatedFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: user2.id,
            score: 5,
            reason: "Excellent",
          },
        ],
      };

      await updateLastImpl(user1.id, updatedFeedback, transaction);

      const listResult = await listImpl(user1.id, transaction);
      expect(listResult.length).to.equal(1);
      expect(listResult[0].feedback.type).to.equal("Mentee");
      if (listResult[0].feedback.type === "Mentee") {
        expect(listResult[0].feedback.mentors[0].score).to.equal(5);
        expect(listResult[0].feedback.mentors[0].reason).to.equal("Excellent");
      }
    });

    it("should throw bad request error if no feedback found", async () => {
      const feedback: MatchFeedback = {
        type: "Mentee",
        mentors: [],
      };

      try {
        await updateLastImpl(user1.id, feedback, transaction);
        expect.fail("Should have thrown error");
      } catch (err: any) {
        expect(err).to.be.instanceOf(TRPCError);
        expect(err.code).to.equal("BAD_REQUEST");
        expect(err.message).to.equal("没有找到反馈记录");
      }
    });
  });

  describe("getLastMatchFeedback", () => {
    it("should retrieve the last feedback of specified type", async () => {
      // Because getLastMatchFeedback doesn't take a transaction parameter,
      // it will hit the actual database, so we insert and commit, then cleanup.

      const user4 = await db.User.create({
        id: uuidv4(),
        email: `user4-${Date.now()}@example.com`,
        name: "Test User 4",
        roles: [],
        likes: 0,
        kudos: 0,
      });

      const oldFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: user2.id,
            score: 3,
            reason: "Old",
          },
        ],
      };

      await db.MatchFeedback.create({
        userId: user4.id,
        feedback: oldFeedback,
        createdAt: new Date(Date.now() - 100000),
      });

      const newFeedback: MatchFeedback = {
        type: "Mentee",
        mentors: [
          {
            id: user2.id,
            score: 5,
            reason: "New",
          },
        ],
      };

      await db.MatchFeedback.create({
        userId: user4.id,
        feedback: newFeedback,
      });

      const lastMentee = await getLastMatchFeedback(user4.id, "Mentee");
      expect(lastMentee).to.not.equal(null);
      expect(lastMentee?.type).to.equal("Mentee");
      if (lastMentee?.type === "Mentee") {
        expect(lastMentee.mentors[0].score).to.equal(5);
      }

      const lastMentor = await getLastMatchFeedback(user4.id, "Mentor");
      expect(lastMentor).to.equal(null);

      // Cleanup
      await db.MatchFeedback.destroy({ where: { userId: user4.id }, force: true });
      await db.User.destroy({ where: { id: user4.id }, force: true });
    });
  });
});
