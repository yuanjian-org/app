import { expect } from "chai";
import db from "api/database/db";
import sequelize from "api/database/sequelize";
import { applyInitialSolverOutputImpl } from "./match";
import { v4 as uuidv4 } from "uuid";

describe("match.ts", () => {
  describe("applyInitialSolverOutputImpl", () => {
    it("should create transactional mentorship and match feedback successfully", async () => {
      try {
        await sequelize.transaction(async (transaction) => {
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
            expect(m.transactional).to.be.true;
          }

          // Assert database state: MatchFeedback for Mentee
          const menteeFeedback = await db.MatchFeedback.findOne({
            where: { userId: mentee.id },
            transaction,
          });
          expect(menteeFeedback).to.not.be.null;
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
          expect(mentor1Feedback).to.not.be.null;
          expect(mentor1Feedback!.feedback.type).to.equal("Mentor");
          expect(mentor1Feedback!.feedback.mentees).to.deep.equal([
            { id: mentee.id },
          ]);

          const mentor2Feedback = await db.MatchFeedback.findOne({
            where: { userId: mentor2.id },
            transaction,
          });
          expect(mentor2Feedback).to.not.be.null;
          expect(mentor2Feedback!.feedback.type).to.equal("Mentor");
          expect(mentor2Feedback!.feedback.mentees).to.deep.equal([
            { id: mentee.id },
          ]);

          // Rollback to clean up the fixtures by throwing an error that will be caught outside
          throw new Error("ROLLBACK_FOR_TEST");
        });
      } catch (e: any) {
        if (e.message !== "ROLLBACK_FOR_TEST") {
          throw e;
        }
      }
    });
  });
});
