import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "api/database/db";
import sequelize from "api/database/sequelize";
import {
  applyInitialSolverOutputImpl,
  createRelationalMentorships,
} from "./match";
import { createMentorship } from "./mentorships";
import { v4 as uuidv4 } from "uuid";

describe("match.ts", () => {
  describe("applyInitialSolverOutputImpl", () => {
    let transaction: any;

    beforeEach(async () => {
      transaction = await sequelize.transaction();
    });

    afterEach(async () => {
      await transaction.rollback();
    });

    it("should create transactional mentorship and match feedback successfully", async () => {
      // Create test users
      const mentee = await db.User.create(
        {
          id: uuidv4(),
          email: `mentee-${uuidv4()}@example.com`,
          name: "Test Mentee",
          role: "User",
          menteeStatus: "现届学子",
          menteeApplication: { source: "test" },
        },
        { transaction },
      );

      const mentor1 = await db.User.create(
        {
          id: uuidv4(),
          email: `mentor1-${uuidv4()}@example.com`,
          name: "Test Mentor 1",
          role: "User",
        },
        { transaction },
      );

      const mentor2 = await db.User.create(
        {
          id: uuidv4(),
          email: `mentor2-${uuidv4()}@example.com`,
          name: "Test Mentor 2",
          role: "User",
        },
        { transaction },
      );

      // The output format is mentee_id,mentor_id1,mentor_id2...
      const output = `${mentee.id},${mentor1.id},${mentor2.id}`;

      // Call the function
      const result = await applyInitialSolverOutputImpl(
        { output, dryrun: false },
        transaction,
      );

      // Assert the return value
      expect(result.length).to.equal(1);
      expect(result[0].mentee.id).to.equal(mentee.id);
      expect(result[0].nonPreferredMentors).to.have.lengthOf(2);
      const returnedMentorIds = result[0].nonPreferredMentors.map((m) => m.id);
      expect(returnedMentorIds).to.include(mentor1.id);
      expect(returnedMentorIds).to.include(mentor2.id);

      // Assert database state: Mentorships
      const mentorships = await db.Mentorship.findAll({
        where: { menteeId: mentee.id },
        transaction,
      });
      expect(mentorships).to.have.lengthOf(2);
      const mentorshipMentorIds = mentorships.map((m) => m.mentorId);
      expect(mentorshipMentorIds).to.include(mentor1.id);
      expect(mentorshipMentorIds).to.include(mentor2.id);
      for (const m of mentorships) {
        expect(m.transactional).to.equal(true);
      }

      // Assert database state: MatchFeedback for Mentee
      const menteeFeedback = await db.MatchFeedback.findOne({
        where: { userId: mentee.id },
        transaction,
      });
      expect(menteeFeedback).to.not.equal(null);
      expect(menteeFeedback!.feedback.type).to.equal("Mentee");
      expect(menteeFeedback!.feedback.mentors).to.deep.equal([
        { id: mentor1.id },
        { id: mentor2.id },
      ]);

      // Assert database state: MatchFeedback for Mentors
      const mentor1Feedback = await db.MatchFeedback.findOne({
        where: { userId: mentor1.id },
        transaction,
      });
      expect(mentor1Feedback).to.not.equal(null);
      expect(mentor1Feedback!.feedback.type).to.equal("Mentor");
      expect(mentor1Feedback!.feedback.mentees).to.deep.equal([
        { id: mentee.id },
      ]);

      const mentor2Feedback = await db.MatchFeedback.findOne({
        where: { userId: mentor2.id },
        transaction,
      });
      expect(mentor2Feedback).to.not.equal(null);
      expect(mentor2Feedback!.feedback.type).to.equal("Mentor");
      expect(mentor2Feedback!.feedback.mentees).to.deep.equal([
        { id: mentee.id },
      ]);
    });

    it("updates existing transactional mentorship in transaction", async () => {
      const mentee = await db.User.create(
        {
          id: uuidv4(),
          email: `mentee-${uuidv4()}@example.com`,
          name: "Test Mentee",
          menteeStatus: "现届学子",
        },
        { transaction },
      );

      const mentor = await db.User.create(
        {
          id: uuidv4(),
          email: `mentor-${uuidv4()}@example.com`,
          name: "Test Mentor",
        },
        { transaction },
      );

      const oldEndsAt = new Date("2025-01-01T00:00:00.000Z").toISOString();
      await createMentorship(
        mentor.id,
        mentee.id,
        true,
        oldEndsAt,
        transaction,
      );

      await applyInitialSolverOutputImpl(
        { output: `${mentee.id},${mentor.id}`, dryrun: false },
        transaction,
      );

      const mentorship = await db.Mentorship.findOne({
        where: { mentorId: mentor.id, menteeId: mentee.id },
        transaction,
      });
      expect(mentorship).to.not.equal(null);
      expect(mentorship!.transactional).to.equal(true);
      expect(new Date(mentorship!.endsAt!).getTime()).to.be.greaterThan(
        new Date(oldEndsAt).getTime(),
      );
    });

    it("rejects converting relational mentorship in transaction", async () => {
      const mentee = await db.User.create(
        {
          id: uuidv4(),
          email: `mentee-${uuidv4()}@example.com`,
          name: "Test Mentee",
          menteeStatus: "现届学子",
        },
        { transaction },
      );

      const mentor = await db.User.create(
        {
          id: uuidv4(),
          email: `mentor-${uuidv4()}@example.com`,
          name: "Test Mentor",
        },
        { transaction },
      );

      await createMentorship(mentor.id, mentee.id, false, null, transaction);

      let thrown: Error | null = null;
      try {
        await applyInitialSolverOutputImpl(
          { output: `${mentee.id},${mentor.id}`, dryrun: false },
          transaction,
        );
      } catch (err) {
        thrown = err as Error;
      }
      expect(thrown).to.not.equal(null);
      expect(thrown!.message).to.include("一对一导师不能转换成不定期导师");
    });
  });

  describe("createRelationalMentorships", () => {
    let transaction: Transaction;

    beforeEach(async () => {
      transaction = await sequelize.transaction();
    });

    afterEach(async () => {
      await transaction.rollback();
    });

    it("upgrades transactional mentorship to relational in tx", async () => {
      const mentee = await db.User.create(
        {
          id: uuidv4(),
          email: `mentee-${uuidv4()}@example.com`,
          name: "Test Mentee",
          menteeStatus: "现届学子",
        },
        { transaction },
      );

      const mentor = await db.User.create(
        {
          id: uuidv4(),
          email: `mentor-${uuidv4()}@example.com`,
          name: "Test Mentor",
        },
        { transaction },
      );

      const endsAt = new Date("2025-01-01T00:00:00.000Z").toISOString();
      await createMentorship(mentor.id, mentee.id, true, endsAt, transaction);

      await createRelationalMentorships(
        { [mentor.id]: [mentee.id] },
        transaction,
      );

      const mentorship = await db.Mentorship.findOne({
        where: { mentorId: mentor.id, menteeId: mentee.id },
        transaction,
      });
      expect(mentorship).to.not.equal(null);
      expect(mentorship!.transactional).to.equal(false);
      expect(mentorship!.endsAt).to.equal(null);
    });
  });
});
