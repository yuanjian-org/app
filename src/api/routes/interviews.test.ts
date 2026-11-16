import { expect } from "chai";
import crypto from "crypto";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import Role from "../../shared/Role";
import { Feedback } from "../../shared/InterviewFeedback";
import { UserPreference } from "../../shared/UserPreference";
import { UserProfile } from "../../shared/UserProfile";
import { findGroups } from "./groups";
import {
  createInterview,
  getInterviewIdForMentee,
  listInterviewerStatsImpl,
  updateInterview,
} from "./interviews";

interface CreateTestUserOptions {
  name?: string;
  roles?: Role[];
  preference?: UserPreference | null;
  profile?: UserProfile | null;
  avoidAsInterviewer?: boolean | null;
}

describe("interviews", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  async function createUser(
    options: CreateTestUserOptions = {},
  ): Promise<string> {
    const user = await db.User.create(
      {
        email: `interviews-${crypto.randomUUID()}@test.com`,
        name: options.name ?? "测试",
        roles: options.roles ?? [],
        preference: options.preference ?? null,
        profile: options.profile ?? null,
        avoidAsInterviewer: options.avoidAsInterviewer ?? null,
      },
      { transaction },
    );
    return user.id;
  }

  describe("createInterview", () => {
    it("creates interview, feedbacks, group, and roles", async () => {
      const calibration = await db.Calibration.create(
        { type: "MenteeInterview", name: "2026 秋招讨论", active: true },
        { transaction },
      );
      const interviewee = await createUser();
      const mentorInterviewer = await createUser({ roles: ["Mentor"] });
      const existingInterviewer = await createUser({
        roles: ["Interviewer"],
      });

      const id = await createInterview(
        "MenteeInterview",
        calibration.id,
        interviewee,
        [mentorInterviewer, existingInterviewer],
        transaction,
      );

      const created = await db.Interview.findByPk(id, { transaction });
      void expect(created).not.to.be.null;
      expect(created?.type).to.equal("MenteeInterview");
      expect(created?.calibrationId).to.equal(calibration.id);
      expect(created?.intervieweeId).to.equal(interviewee);

      const feedbacks = await db.InterviewFeedback.findAll({
        where: { interviewId: id },
        transaction,
      });
      expect(feedbacks.length).to.equal(2);
      const feedbackInterviewerIds = feedbacks.map((f) => f.interviewerId);
      expect(feedbackInterviewerIds).to.have.members([
        mentorInterviewer,
        existingInterviewer,
      ]);
      for (const f of feedbacks) {
        void expect(f.feedback).to.be.null;
        void expect(f.feedbackUpdatedAt).to.be.null;
      }

      const promoted = await db.User.findByPk(mentorInterviewer, {
        transaction,
      });
      expect(promoted?.roles).to.deep.equal(["Mentor", "Interviewer"]);

      // Existing Interviewer role should not be duplicated.
      const unchanged = await db.User.findByPk(existingInterviewer, {
        transaction,
      });
      expect(unchanged?.roles).to.deep.equal(["Interviewer"]);

      const gs = await findGroups(
        [interviewee, mentorInterviewer, existingInterviewer],
        "exclusive",
        undefined,
        undefined,
        transaction,
      );
      expect(gs.length).to.equal(1);

      const ownedGroup = await db.Group.findOne({
        where: { interviewId: id },
        transaction,
      });
      expect(ownedGroup?.id).to.equal(gs[0].id);
    });

    it("rejects interviewee also listed as interviewer", async () => {
      const interviewee = await createUser();
      const interviewer = await createUser();

      try {
        await createInterview(
          "MenteeInterview",
          null,
          interviewee,
          [interviewee, interviewer],
          transaction,
        );
        expect.fail("Should have rejected interviewee as interviewer");
      } catch (err: unknown) {
        expect((err as Error).message).to.contain("面试官和候选人不能是同一人");
      }
    });
  });

  describe("updateInterview", () => {
    it("updates candidate, calibration, and interviewers", async () => {
      const calibration = await db.Calibration.create(
        { type: "MenteeInterview", name: "更新测试讨论", active: true },
        { transaction },
      );
      const interviewee1 = await createUser();
      const interviewee2 = await createUser();
      const interviewer1 = await createUser();
      const interviewer2 = await createUser();
      const interviewer3 = await createUser({ roles: [] });

      const id = await createInterview(
        "MenteeInterview",
        null,
        interviewee1,
        [interviewer1, interviewer2],
        transaction,
      );

      await updateInterview(
        id,
        "MenteeInterview",
        calibration.id,
        interviewee2,
        [interviewer2, interviewer3],
        transaction,
      );

      const updated = await db.Interview.findByPk(id, { transaction });
      expect(updated?.intervieweeId).to.equal(interviewee2);
      expect(updated?.calibrationId).to.equal(calibration.id);

      const feedbacks = await db.InterviewFeedback.findAll({
        where: { interviewId: id },
        transaction,
      });
      expect(feedbacks.length).to.equal(2);
      expect(feedbacks.map((f) => f.interviewerId)).to.have.members([
        interviewer2,
        interviewer3,
      ]);

      const added = await db.User.findByPk(interviewer3, { transaction });
      expect(added?.roles).to.deep.equal(["Interviewer"]);

      const newGroups = await findGroups(
        [interviewee2, interviewer2, interviewer3],
        "exclusive",
        undefined,
        undefined,
        transaction,
      );
      expect(newGroups.length).to.equal(1);

      const oldGroups = await findGroups(
        [interviewee1, interviewer1, interviewer2],
        "exclusive",
        undefined,
        undefined,
        transaction,
      );
      expect(oldGroups.length).to.equal(0);
    });

    it("keeps submitted feedback when replacing others", async () => {
      const interviewee = await createUser();
      const interviewer1 = await createUser();
      const interviewer2 = await createUser();
      const interviewer3 = await createUser();

      const id = await createInterview(
        "MenteeInterview",
        null,
        interviewee,
        [interviewer1, interviewer2],
        transaction,
      );

      const feedbackData: Feedback = {
        dimensions: [{ name: "学习意愿", score: 4, comment: "Strong" }],
      };
      await db.InterviewFeedback.update(
        { feedback: feedbackData, feedbackUpdatedAt: new Date() },
        {
          where: { interviewId: id, interviewerId: interviewer1 },
          transaction,
        },
      );

      await updateInterview(
        id,
        "MenteeInterview",
        null,
        interviewee,
        [interviewer1, interviewer3],
        transaction,
      );

      const kept = await db.InterviewFeedback.findOne({
        where: { interviewId: id, interviewerId: interviewer1 },
        transaction,
      });
      expect(kept?.feedback).to.deep.equal(feedbackData);
      void expect(kept?.feedbackUpdatedAt).not.to.be.null;

      const removed = await db.InterviewFeedback.findOne({
        where: { interviewId: id, interviewerId: interviewer2 },
        transaction,
      });
      void expect(removed).to.be.null;

      const added = await db.InterviewFeedback.findOne({
        where: { interviewId: id, interviewerId: interviewer3 },
        transaction,
      });
      void expect(added).not.to.be.null;
    });

    it("throws not found error for missing interview", async () => {
      const interviewee = await createUser();
      const interviewer = await createUser();

      try {
        await updateInterview(
          crypto.randomUUID(),
          "MenteeInterview",
          null,
          interviewee,
          [interviewer],
          transaction,
        );
        expect.fail("Should have thrown not found error");
      } catch (err: unknown) {
        expect((err as Error).message).to.contain("面试");
      }
    });

    it("rejects interviewee as interviewer on update", async () => {
      const interviewee = await createUser();
      const interviewer = await createUser();
      const id = await createInterview(
        "MenteeInterview",
        null,
        interviewee,
        [interviewer],
        transaction,
      );

      try {
        await updateInterview(
          id,
          "MenteeInterview",
          null,
          interviewee,
          [interviewee, interviewer],
          transaction,
        );
        expect.fail("Should have rejected interviewee as interviewer");
      } catch (err: unknown) {
        expect((err as Error).message).to.contain("面试官和候选人不能是同一人");
      }
    });

    it("rejects changing interview type", async () => {
      const interviewee = await createUser();
      const interviewer = await createUser();
      const id = await createInterview(
        "MenteeInterview",
        null,
        interviewee,
        [interviewer],
        transaction,
      );

      try {
        await updateInterview(
          id,
          "MentorInterview",
          null,
          interviewee,
          [interviewer],
          transaction,
        );
        expect.fail("Should have rejected interview type change");
      } catch (err: unknown) {
        expect((err as Error).message).to.contain("面试类型错误");
      }
    });

    it("rejects changing candidate after feedback", async () => {
      const interviewee1 = await createUser();
      const interviewee2 = await createUser();
      const interviewer = await createUser();
      const id = await createInterview(
        "MenteeInterview",
        null,
        interviewee1,
        [interviewer],
        transaction,
      );

      await db.InterviewFeedback.update(
        { feedbackUpdatedAt: new Date() },
        { where: { interviewId: id, interviewerId: interviewer }, transaction },
      );

      try {
        await updateInterview(
          id,
          "MenteeInterview",
          null,
          interviewee2,
          [interviewer],
          transaction,
        );
        expect.fail("Should have rejected candidate change after feedback");
      } catch (err: unknown) {
        expect((err as Error).message).to.contain(
          "面试反馈已经递交，无法更改候选人",
        );
      }
    });

    it("rejects removing interviewer with feedback", async () => {
      const interviewee = await createUser();
      const interviewer1 = await createUser({ name: "张伟" });
      const interviewer2 = await createUser();
      const id = await createInterview(
        "MenteeInterview",
        null,
        interviewee,
        [interviewer1, interviewer2],
        transaction,
      );

      await db.InterviewFeedback.update(
        { feedbackUpdatedAt: new Date() },
        {
          where: { interviewId: id, interviewerId: interviewer1 },
          transaction,
        },
      );

      try {
        await updateInterview(
          id,
          "MenteeInterview",
          null,
          interviewee,
          [interviewer2],
          transaction,
        );
        expect.fail("Should have rejected removing interviewer with feedback");
      } catch (err: unknown) {
        expect((err as Error).message).to.contain(
          "面试官张伟已经递交反馈，无法移除",
        );
      }
    });
  });

  describe("getInterviewIdForMentee", () => {
    it("returns MenteeInterview ID and ignores Mentor", async () => {
      const candidate = await createUser();
      const interviewer = await createUser();

      const none = await getInterviewIdForMentee(candidate, transaction);
      void expect(none).to.be.null;

      await createInterview(
        "MentorInterview",
        null,
        candidate,
        [interviewer],
        transaction,
      );
      const afterMentor = await getInterviewIdForMentee(candidate, transaction);
      void expect(afterMentor).to.be.null;

      const menteeInterviewId = await createInterview(
        "MenteeInterview",
        null,
        candidate,
        [interviewer],
        transaction,
      );
      const found = await getInterviewIdForMentee(candidate, transaction);
      expect(found).to.equal(menteeInterviewId);
    });
  });

  describe("listInterviewerStatsImpl", () => {
    it("filters users and counts interviews and mentees", async () => {
      const mentorId = await createUser({
        roles: ["Mentor"],
        avoidAsInterviewer: true,
        profile: { 专业领域: "人工智能" },
      });
      const optInId = await createUser({
        roles: [],
        preference: { interviewer: { optIn: true } },
      });
      const pastInterviewerId = await createUser({
        roles: [],
        preference: { interviewer: { optIn: false } },
      });
      const ineligibleId = await createUser({ roles: ["Mentee"] });

      // Create two interviews for mentorId and one for pastInterviewerId.
      await createInterview(
        "MenteeInterview",
        null,
        await createUser(),
        [mentorId],
        transaction,
      );
      await createInterview(
        "MenteeInterview",
        null,
        await createUser(),
        [mentorId],
        transaction,
      );
      await createInterview(
        "MentorInterview",
        null,
        await createUser(),
        [pastInterviewerId],
        transaction,
      );

      // Only ongoing non-transactional mentorships should be counted.
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      await db.Mentorship.create(
        {
          mentorId,
          menteeId: await createUser(),
          transactional: false,
          endsAt: null,
        },
        { transaction },
      );
      await db.Mentorship.create(
        {
          mentorId,
          menteeId: await createUser(),
          transactional: false,
          endsAt: new Date(Date.now() + sevenDaysMs),
        },
        { transaction },
      );
      await db.Mentorship.create(
        {
          mentorId,
          menteeId: await createUser(),
          transactional: false,
          endsAt: new Date(Date.now() - sevenDaysMs),
        },
        { transaction },
      );
      await db.Mentorship.create(
        {
          mentorId,
          menteeId: await createUser(),
          transactional: true,
          endsAt: null,
        },
        { transaction },
      );

      const stats = await listInterviewerStatsImpl(transaction);

      const mentorStats = stats.find((s) => s.user.id === mentorId);
      void expect(mentorStats).not.to.be.undefined;
      expect(mentorStats?.interviews).to.equal(2);
      expect(mentorStats?.ongoingRelationalMentorships).to.equal(2);
      void expect(mentorStats?.avoid).to.be.true;
      expect(mentorStats?.profile.专业领域).to.equal("人工智能");

      const optInStats = stats.find((s) => s.user.id === optInId);
      void expect(optInStats).not.to.be.undefined;
      expect(optInStats?.interviews).to.equal(0);
      expect(optInStats?.ongoingRelationalMentorships).to.equal(0);
      void expect(optInStats?.avoid).to.be.false;
      void expect(optInStats?.preference.optIn).to.be.true;

      const pastStats = stats.find((s) => s.user.id === pastInterviewerId);
      void expect(pastStats).not.to.be.undefined;
      expect(pastStats?.interviews).to.equal(1);
      expect(pastStats?.ongoingRelationalMentorships).to.equal(0);
      void expect(pastStats?.avoid).to.be.false;

      const ineligibleStats = stats.find((s) => s.user.id === ineligibleId);
      void expect(ineligibleStats).to.be.undefined;
    });
  });
});
