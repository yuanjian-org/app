import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import interviewsRouter, {
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

  it("`InterviewerManager` should be allowed to access stats and avoid", async () => {
    const manager = { id: "mgr", roles: ["InterviewerManager"] } as any;
    const caller = interviewsRouter.createCaller({
      me: manager,
      req: {} as any,
      res: {} as any,
    });

    const stats = await caller.listInterviewerStats();
    expect(stats).to.be.an("array");

    const targetUserId = await createUser("target@test.com");
    await caller.avoidAsInterviewer({ userId: targetUserId, avoid: true });
    const target = await db.User.findByPk(targetUserId, { transaction });
    void expect(target?.avoidAsInterviewer).to.be.true;
  });

  it("Regular user should be denied access to stats and avoid", async () => {
    const regularUser = { id: "reg", roles: ["Mentor"] } as any;
    const caller = interviewsRouter.createCaller({
      me: regularUser,
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.listInterviewerStats();
      expect.fail("Should have thrown error");
    } catch (e: any) {
      expect(e.message).to.include("没有权限访问");
    }

    try {
      await caller.avoidAsInterviewer({ userId: "some-id", avoid: true });
      expect.fail("Should have thrown error");
    } catch (e: any) {
      expect(e.message).to.include("没有权限访问");
    }
  });
});
