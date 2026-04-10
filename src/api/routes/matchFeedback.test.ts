import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "api/database/db";
import sequelize from "api/database/sequelize";
import {
  listImpl,
  updateLastImpl,
  getLastMatchFeedback,
} from "./matchFeedback";
import { randomUUID } from "crypto";

describe("matchFeedback", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createTestUser() {
    const user = await db.User.create(
      {
        id: randomUUID(),
        email: `test-${Date.now()}-${Math.random()}@test.com`,
        name: "Test User",
      },
      { transaction },
    );
    return user;
  }

  describe("listImpl", () => {
    it("should return mentee match feedbacks with user populated", async () => {
      const me = await createTestUser();
      const mentor = await createTestUser();

      await db.MatchFeedback.create(
        {
          userId: me.id,
          feedback: {
            type: "Mentee",
            mentors: [
              {
                id: mentor.id,
                score: 5,
                reason: "Great mentor",
              },
            ],
          },
        },
        { transaction },
      );

      const results = await listImpl(me.id, transaction);
      expect(results).to.have.lengthOf(1);
      const feedback = results[0].feedback;
      expect(feedback.type).to.equal("Mentee");
      if (feedback.type === "Mentee") {
        expect(feedback.mentors).to.have.lengthOf(1);
        expect(feedback.mentors[0].user).to.not.be.undefined;
        expect(feedback.mentors[0].user?.id).to.equal(mentor.id);
        expect(feedback.mentors[0].score).to.equal(5);
        expect(feedback.mentors[0].reason).to.equal("Great mentor");
      }
    });

    it("should return mentor match feedbacks with user populated", async () => {
      const me = await createTestUser();
      const mentee = await createTestUser();

      await db.MatchFeedback.create(
        {
          userId: me.id,
          feedback: {
            type: "Mentor",
            mentees: [
              {
                id: mentee.id,
                choice: "Prefer",
                reason: "Good potential",
              },
            ],
          },
        },
        { transaction },
      );

      const results = await listImpl(me.id, transaction);
      expect(results).to.have.lengthOf(1);
      const feedback = results[0].feedback;
      expect(feedback.type).to.equal("Mentor");
      if (feedback.type === "Mentor") {
        expect(feedback.mentees).to.have.lengthOf(1);
        expect(feedback.mentees[0].user).to.not.be.undefined;
        expect(feedback.mentees[0].user?.id).to.equal(mentee.id);
        expect(feedback.mentees[0].choice).to.equal("Prefer");
        expect(feedback.mentees[0].reason).to.equal("Good potential");
      }
    });
  });

  describe("updateLastImpl", () => {
    it("should update the most recent feedback", async () => {
      const me = await createTestUser();
      const mentor1 = await createTestUser();
      const mentor2 = await createTestUser();

      await db.MatchFeedback.create(
        {
          userId: me.id,
          feedback: {
            type: "Mentee",
            mentors: [{ id: mentor1.id, score: 3 }],
          },
        },
        { transaction },
      );

      // Create a newer one
      await db.MatchFeedback.create(
        {
          userId: me.id,
          feedback: {
            type: "Mentee",
            mentors: [{ id: mentor1.id, score: 4 }],
          },
        },
        { transaction },
      );

      await updateLastImpl(
        me.id,
        {
          type: "Mentee",
          mentors: [
            { id: mentor1.id, score: 5 },
            { id: mentor2.id, score: 2 },
          ],
        },
        transaction,
      );

      const results = await listImpl(me.id, transaction);
      expect(results).to.have.lengthOf(2);

      // Sequelize order is not guaranteed in test unless we sort by createdAt DESC
      // listImpl doesn't sort explicitly but DB.findAll defaults to insertion order or PK
      // Let's just fetch from DB to be sure of the exact state
      const records = await db.MatchFeedback.findAll({
        where: { userId: me.id },
        order: [["createdAt", "DESC"]],
        transaction,
      });

      expect(records[0].feedback.type).to.equal("Mentee");
      if (records[0].feedback.type === "Mentee") {
        expect(records[0].feedback.mentors).to.have.lengthOf(2);
        expect(records[0].feedback.mentors[0].score).to.equal(5);
        expect(records[0].feedback.mentors[1].score).to.equal(2);
      }
    });

    it("should throw error if no feedback exists", async () => {
      const me = await createTestUser();
      const mentor = await createTestUser();

      try {
        await updateLastImpl(
          me.id,
          {
            type: "Mentee",
            mentors: [{ id: mentor.id, score: 5 }],
          },
          transaction,
        );
        expect.fail("Should have thrown an error");
      } catch (err: any) {
        expect(err.message).to.equal("没有找到反馈记录");
      }
    });
  });

  describe("getLastMatchFeedback", () => {
    it("should return the latest mentee feedback", async () => {
      const me = await createTestUser();
      const mentor = await createTestUser();

      await db.MatchFeedback.create(
        {
          userId: me.id,
          feedback: {
            type: "Mentee",
            mentors: [{ id: mentor.id, score: 3 }],
          },
        },
        { transaction },
      );

      const latest = await getLastMatchFeedback(me.id, "Mentee", transaction);
      expect(latest).to.not.be.null;
      expect(latest?.type).to.equal("Mentee");
      if (latest?.type === "Mentee") {
        expect(latest.mentors[0].score).to.equal(3);
      }
    });

    it("should return null if the latest is not of the requested type", async () => {
      const me = await createTestUser();
      const mentee = await createTestUser();

      await db.MatchFeedback.create(
        {
          userId: me.id,
          feedback: {
            type: "Mentor",
            mentees: [{ id: mentee.id, choice: "Prefer" }],
          },
        },
        { transaction },
      );

      const latest = await getLastMatchFeedback(me.id, "Mentee", transaction);
      expect(latest).to.be.null;
    });

    it("should return null if no feedback exists", async () => {
      const me = await createTestUser();
      const latest = await getLastMatchFeedback(me.id, "Mentor", transaction);
      expect(latest).to.be.null;
    });
  });
});
