import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import {
  createInterview,
  listInterviewerStatsImpl,
  updateInterview,
} from "./interviews";
import { findGroups } from "./groups";
import sequelize from "../database/sequelize";

const intervieweeEmail = "test-interviewee@email.com";
const interviewer1Email = "test-interviewer1@email.com";
const interviewer2Email = "test-interviewer2@email.com";
const interviewer3Email = "test-interviewer3@email.com";

describe("interviews", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createUser(email: string): Promise<string> {
    const user = await db.User.create(
      { email, name: "测试", roles: [] },
      { transaction },
    );
    return user.id;
  }

  it("`create` should create group", async () => {
    const interviewee = await createUser(intervieweeEmail);
    const interviewers = [
      await createUser(interviewer1Email),
      await createUser(interviewer2Email),
    ];

    await createInterview(
      "MenteeInterview",
      null,
      interviewee,
      interviewers,
      transaction,
    );

    const gs = await findGroups(
      [interviewee, ...interviewers],
      "exclusive",
      undefined,
      undefined,
      transaction,
    );
    expect(gs.length).is.equal(1);
  });

  it("`update` should update group", async () => {
    const interviewee = await createUser(intervieweeEmail);
    const interviewers = [await createUser(interviewer2Email)];
    const id = await createInterview(
      "MenteeInterview",
      null,
      interviewee,
      interviewers,
      transaction,
    );

    const newInterviewers = [
      await createUser(interviewer1Email),
      await createUser(interviewer3Email),
    ];

    await updateInterview(
      id,
      "MenteeInterview",
      null,
      interviewee,
      newInterviewers,
      transaction,
    );

    const gs = await findGroups(
      [interviewee, ...newInterviewers],
      "exclusive",
      undefined,
      undefined,
      transaction,
    );
    expect(gs.length).is.equal(1);
  });

  it("`listInterviewerStatsImpl` should count ongoing relational mentorships", async () => {
    const mentorId = await createUser("mentor@test.com");
    const mentor = await db.User.findByPk(mentorId, { transaction });
    if (mentor) {
      mentor.roles = ["Mentor"];
      await mentor.save({ transaction });
    }

    const menteeId = await createUser("mentee@test.com");

    await db.Mentorship.create(
      {
        mentorId,
        menteeId,
        transactional: false,
        endsAt: null,
      },
      { transaction },
    );

    const stats = await listInterviewerStatsImpl(transaction);
    const mentorStats = stats.find((s) => s.user.id === mentorId);
    expect(mentorStats).to.not.equal(undefined);
    expect(mentorStats?.ongoingRelationalMentorships).to.equal(1);
  });
});
