import { expect } from "chai";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import Role from "../../shared/Role";
import User from "../../shared/User";
import {
  getInterviewFeedbackImpl,
  updateInterviewFeedbackImpl,
} from "./interviewFeedbacks";

type TestUser = Awaited<ReturnType<typeof db.User.create>>;
type TestInterview = Awaited<ReturnType<typeof db.Interview.create>>;
type TestFeedback = Awaited<ReturnType<typeof db.InterviewFeedback.create>>;

describe("interviewFeedbacks routes", () => {
  let transaction: Transaction;
  let interviewee: TestUser;
  let interviewer: TestUser;
  let manager: TestUser;
  let stranger: TestUser;
  let interview: TestInterview;
  let interviewFeedback: TestFeedback;

  async function createUser(
    name: string,
    roles: Role[] = [],
  ): Promise<TestUser> {
    return await db.User.create(
      {
        email: `${crypto.randomUUID()}@example.com`,
        name,
        roles,
      },
      { transaction },
    );
  }

  async function expectPermissionDenied(
    id: string,
    me: User,
    allowOnlyInterviewer: boolean,
  ) {
    try {
      await getInterviewFeedbackImpl(id, me, allowOnlyInterviewer, transaction);
      expect.fail("Should have thrown noPermissionError");
    } catch (e: unknown) {
      expect(e).to.be.instanceOf(TRPCError);
      const err = e as TRPCError;
      expect(err.code).to.equal("FORBIDDEN");
      expect(err.message).to.include("没有权限访问");
    }
  }

  async function createCalibrationFeedback(active: boolean) {
    const calibration = await db.Calibration.create(
      {
        type: "MenteeInterview",
        name: `Calibration ${crypto.randomUUID()}`,
        active,
      },
      { transaction },
    );
    const calibratedInterview = await db.Interview.create(
      {
        type: "MenteeInterview",
        intervieweeId: interviewee.id,
        calibrationId: calibration.id,
      },
      { transaction },
    );
    const feedback = await db.InterviewFeedback.create(
      {
        interviewId: calibratedInterview.id,
        interviewerId: interviewer.id,
      },
      { transaction },
    );

    const participant = await createUser("Calibration Participant");
    const otherInterviewee = await createUser("Other Interviewee");
    const peerInterview = await db.Interview.create(
      {
        type: "MenteeInterview",
        intervieweeId: otherInterviewee.id,
        calibrationId: calibration.id,
      },
      { transaction },
    );
    await db.InterviewFeedback.create(
      {
        interviewId: peerInterview.id,
        interviewerId: participant.id,
      },
      { transaction },
    );

    return { feedback, participant };
  }

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    interviewee = await createUser("Test Interviewee");
    interviewer = await createUser("Test Interviewer");
    manager = await createUser("Test Manager", ["MentorshipAdmin"]);
    stranger = await createUser("Test Stranger");

    interview = await db.Interview.create(
      {
        type: "MenteeInterview",
        intervieweeId: interviewee.id,
      },
      { transaction },
    );

    // Create interview feedback with valid zFeedback data
    interviewFeedback = await db.InterviewFeedback.create(
      {
        interviewId: interview.id,
        interviewerId: interviewer.id,
        feedback: {
          dimensions: [{ name: "能力", score: 3 }],
        },
      },
      { transaction },
    );
  });

  afterEach(async () => {
    await transaction?.rollback();
  });

  describe("getInterviewFeedbackImpl", () => {
    it("should throw NOT_FOUND when feedback does not exist", async () => {
      const missingId = crypto.randomUUID();
      try {
        await getInterviewFeedbackImpl(missingId, manager, false, transaction);
        expect.fail("Should have thrown notFoundError");
      } catch (e: unknown) {
        expect(e).to.be.instanceOf(TRPCError);
        const err = e as TRPCError;
        expect(err.code).to.equal("NOT_FOUND");
        expect(err.message).to.equal(`面试反馈 ${missingId} 不存在。`);
      }
    });

    it("should allow interviewer to access", async () => {
      const f = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        interviewer,
        false,
        transaction,
      );
      expect(f.id).to.equal(interviewFeedback.id);

      const fStrict = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        interviewer,
        true,
        transaction,
      );
      expect(fStrict.id).to.equal(interviewFeedback.id);
    });

    it("allows MentorshipAdmin unless strict mode", async () => {
      const f = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        manager,
        false,
        transaction,
      );
      expect(f.id).to.equal(interviewFeedback.id);

      await expectPermissionDenied(interviewFeedback.id, manager, true);
    });

    it("allows active calibration participant unless strict mode", async () => {
      const { feedback, participant } = await createCalibrationFeedback(true);

      const f = await getInterviewFeedbackImpl(
        feedback.id,
        participant,
        false,
        transaction,
      );
      expect(f.id).to.equal(feedback.id);

      await expectPermissionDenied(feedback.id, participant, true);
    });

    it("should deny participant of an inactive calibration", async () => {
      const { feedback, participant } = await createCalibrationFeedback(false);

      await expectPermissionDenied(feedback.id, participant, false);
    });

    it("denies participant of a different active calibration", async () => {
      const { feedback } = await createCalibrationFeedback(true);
      const { participant: otherParticipant } =
        await createCalibrationFeedback(true);

      await expectPermissionDenied(feedback.id, otherParticipant, false);
    });

    it("allows relational mentor unless strict mode", async () => {
      const mentor = await createUser("Relational Mentor", ["Mentor"]);
      await db.Mentorship.create(
        {
          mentorId: mentor.id,
          menteeId: interviewee.id,
          transactional: false,
          endsAt: null,
        },
        { transaction },
      );

      const f = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        mentor,
        false,
        transaction,
      );
      expect(f.id).to.equal(interviewFeedback.id);

      await expectPermissionDenied(interviewFeedback.id, mentor, true);
    });

    it("allows ongoing transactional mentor and denies ended one", async () => {
      const activeMentor = await createUser("Active Transactional Mentor", [
        "Mentor",
      ]);
      const endedMentor = await createUser("Ended Transactional Mentor", [
        "Mentor",
      ]);
      const dayMs = 24 * 60 * 60 * 1000;

      await db.Mentorship.create(
        {
          mentorId: activeMentor.id,
          menteeId: interviewee.id,
          transactional: true,
          endsAt: new Date(Date.now() + dayMs),
        },
        { transaction },
      );
      await db.Mentorship.create(
        {
          mentorId: endedMentor.id,
          menteeId: interviewee.id,
          transactional: true,
          endsAt: new Date(Date.now() - dayMs),
        },
        { transaction },
      );

      const f = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        activeMentor,
        false,
        transaction,
      );
      expect(f.id).to.equal(interviewFeedback.id);

      await expectPermissionDenied(interviewFeedback.id, activeMentor, true);
      await expectPermissionDenied(interviewFeedback.id, endedMentor, false);
    });

    it("should deny MentorshipOperator and stranger", async () => {
      const operator = await createUser("Operator", ["MentorshipOperator"]);

      await expectPermissionDenied(interviewFeedback.id, operator, false);
      await expectPermissionDenied(interviewFeedback.id, stranger, false);
    });
  });

  describe("updateInterviewFeedbackImpl", () => {
    it("should allow interviewer to update with correct ETag", async () => {
      await getInterviewFeedbackImpl(
        interviewFeedback.id,
        interviewer,
        true,
        transaction,
      );
      // feedbackUpdatedAt is initially null for
      // create without it, so date2etag gives 0.
      const initialEtag = 0;

      // Use valid zFeedback data including null score/comment values
      const updatedFeedback = {
        dimensions: [
          { name: "能力", score: 5, comment: "优秀" },
          { name: "总评", score: null, comment: null },
        ],
      };

      const newEtag = await updateInterviewFeedbackImpl(
        interviewFeedback.id,
        updatedFeedback,
        initialEtag,
        interviewer,
        transaction,
      );

      const fAfter = await getInterviewFeedbackImpl(
        interviewFeedback.id,
        interviewer,
        true,
        transaction,
      );
      expect(fAfter.feedback).to.deep.equal(updatedFeedback);
      expect(newEtag).to.be.greaterThan(0);
    });

    it("should fail to update with incorrect ETag", async () => {
      try {
        await updateInterviewFeedbackImpl(
          interviewFeedback.id,
          { dimensions: [{ name: "能力", score: 4 }] },
          123456789, // Fake ETag
          interviewer,
          transaction,
        );
        expect.fail("Should have thrown conflictError");
      } catch (e: unknown) {
        expect((e as Error).message).to.equal("版本冲突。");
      }
    });

    it("denies non-interviewer update even for MentorshipAdmin", async () => {
      try {
        await updateInterviewFeedbackImpl(
          interviewFeedback.id,
          { dimensions: [{ name: "能力", score: 4 }] },
          0,
          manager,
          transaction,
        );
        expect.fail("Should have thrown noPermissionError");
      } catch (e: unknown) {
        expect((e as Error).message).to.include("没有权限访问");
      }
    });
  });
});
