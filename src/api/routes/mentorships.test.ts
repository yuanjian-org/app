import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import * as notifyModule from "../notify";
import moment from "moment";
import sinon from "sinon";
import {
  auditLastMentorshipMeetings,
  createMentorship,
  updateMentorship,
  updateMentorshipSchedule,
} from "./mentorships";
import invariant from "shared/invariant";
import { oneOnOneYellowThreshold } from "shared/Mentorship";

describe("createMentorship", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should successfully create a mentorship and associated group", async () => {
    const mentor = await db.User.create(
      { email: "mentor1@test.com", name: "Mentor1", roles: [] },
      { transaction },
    );
    const mentee = await db.User.create(
      { email: "mentee1@test.com", name: "Mentee1", roles: [] },
      { transaction },
    );

    await createMentorship(mentor.id, mentee.id, false, null, transaction);

    const updatedMentor = await db.User.findByPk(mentor.id, { transaction });
    const updatedMentee = await db.User.findByPk(mentee.id, { transaction });

    void expect(updatedMentor?.roles).to.include("Mentor");
    void expect(updatedMentee?.roles).to.include("Mentee");

    const mentorship = await db.Mentorship.findOne({
      where: { mentorId: mentor.id, menteeId: mentee.id },
      transaction,
    });
    void expect(mentorship).to.not.be.null;

    const group = await db.Group.findOne({
      where: { partnershipId: mentorship?.id },
      transaction,
    });
    void expect(group).to.not.be.null;
  });

  it("should throw generalBadRequestError for invalid user IDs", async () => {
    let errorThrown = false;
    try {
      await createMentorship(
        "00000000-0000-0000-0000-000000000000",
        "00000000-0000-0000-0000-000000000000",
        false,
        null,
        transaction,
      );
    } catch (e: any) {
      errorThrown = true;
      void expect(e.message).to.equal("无效用户ID");
    }
    void expect(errorThrown).to.be.true;
  });

  it("should throw alreadyExistsError when creating a duplicate mentorship", async () => {
    const mentor = await db.User.create(
      { email: "mentor2@test.com", name: "Mentor2", roles: [] },
      { transaction },
    );
    const mentee = await db.User.create(
      { email: "mentee2@test.com", name: "Mentee2", roles: [] },
      { transaction },
    );

    await createMentorship(mentor.id, mentee.id, false, null, transaction);

    let errorThrown = false;
    try {
      await createMentorship(mentor.id, mentee.id, false, null, transaction);
    } catch (e: any) {
      errorThrown = true;
      void expect(e.message).to.equal("一对一匹配已经存在。");
    }
    void expect(errorThrown).to.be.true;
  });
});

describe("updateMentorship", () => {
  let transaction: Transaction;
  let mentorshipId: string;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    const mentor = await db.User.create(
      { email: "update-mentor@test.com", name: "UpdateMentor", roles: [] },
      { transaction },
    );
    const mentee = await db.User.create(
      { email: "update-mentee@test.com", name: "UpdateMentee", roles: [] },
      { transaction },
    );
    await createMentorship(mentor.id, mentee.id, false, null, transaction);
    const mentorship = await db.Mentorship.findOne({
      where: { mentorId: mentor.id, menteeId: mentee.id },
      transaction,
    });
    mentorshipId = mentorship!.id;
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should successfully update a mentorship", async () => {
    const endsAt = moment().add(30, "days").toDate();
    await updateMentorship(mentorshipId, false, endsAt, transaction);
    const updatedMentorship = await db.Mentorship.findByPk(mentorshipId, {
      transaction,
    });

    // We expect endsAt to be set
    void expect(updatedMentorship?.endsAt).to.not.be.null;
    // We expect it to be a valid date
    if (updatedMentorship?.endsAt) {
      expect(moment(updatedMentorship.endsAt).format("YYYY-MM-DD")).to.equal(
        moment(endsAt).format("YYYY-MM-DD"),
      );
    }
  });

  it("should throw notFoundError for an invalid mentorship ID", async () => {
    let errorThrown = false;
    try {
      await updateMentorship(
        "00000000-0000-0000-0000-000000000000",
        false,
        null,
        transaction,
      );
    } catch (e: any) {
      errorThrown = true;
      expect(e.message).to.equal(
        "一对一匹配 00000000-0000-0000-0000-000000000000 不存在。",
      );
    }
    void expect(errorThrown).to.be.true;
  });

  it("should throw generalBadRequestError when attempting to convert a non-transactional mentorship to a transactional one", async () => {
    let errorThrown = false;
    try {
      await updateMentorship(mentorshipId, true, null, transaction);
    } catch (e: any) {
      errorThrown = true;
      void expect(e.message).to.equal("一对一导师不能转换为不定期导师");
    }
    void expect(errorThrown).to.be.true;
  });
});

describe("auditLastMentorshipMeetings", () => {
  let transaction: Transaction;
  let notifyStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    notifyStub = sinon.stub(notifyModule, "notify").callsFake(() => {
      return Promise.resolve();
    });
  });

  afterEach(async () => {
    await transaction.rollback();
    sinon.restore();
  });

  it("should call notify with correct parameters when mentorship has old one-on-one meeting", async () => {
    const mentor = await db.User.create(
      {
        email: "mentor@test.com",
        phone: "+8613800138000",
        name: "Test Mentor",
        roles: ["Mentor"],
      },
      { transaction },
    );

    const mentee = await db.User.create(
      {
        email: "mentee@test.com",
        phone: "+8613800138001",
        name: "Test Mentee",
        roles: ["Mentee"],
      },
      { transaction },
    );

    const mentorship = await db.Mentorship.create(
      {
        mentorId: mentor.id,
        menteeId: mentee.id,
        transactional: false,
      },
      { transaction },
    );

    const group = await db.Group.create(
      {
        name: "Test Group",
        public: false,
        archived: false,
        partnershipId: mentorship.id,
      },
      { transaction },
    );

    const oldMeetingDate = moment()
      .subtract(oneOnOneYellowThreshold + 1, "days")
      .toDate();
    await db.Transcript.create(
      {
        id: `test-transcript-${Date.now()}`,
        groupId: group.id,
        startedAt: oldMeetingDate,
        endedAt: moment(oldMeetingDate).add(1, "hour").toDate(),
      },
      { transaction },
    );

    await auditLastMentorshipMeetings(transaction);

    // Verify notify was called with correct parameters
    // The function processes all mentorships with old meetings, so we
    // expect multiple calls
    void expect(notifyStub.called).to.be.true;

    // Find the call for our specific mentorship
    const ourMentorshipCall = notifyStub
      .getCalls()
      .find((call) => call.args[1].includes(mentor.id));

    invariant(ourMentorshipCall, "call to notify was not found");
    void expect(ourMentorshipCall.args[0]).to.equal("一对一通话提醒");
    void expect(ourMentorshipCall.args[1]).to.include(mentor.id);
    void expect(ourMentorshipCall.args[3]).to.have.property("days");
  });
});

describe("updateMentorshipSchedule", () => {
  let transaction: Transaction;
  let mentorshipId: string;
  let mentor: { id: string; roles: ("Mentor" | "MentorshipAdmin")[] };
  let otherMentor: { id: string; roles: ("Mentor" | "MentorshipAdmin")[] };
  let admin: { id: string; roles: ("Mentor" | "MentorshipAdmin")[] };

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    mentor = await db.User.create(
      {
        email: `sched-mentor-${Date.now()}@test.com`,
        name: "SchedMentor",
        roles: ["Mentor"],
      },
      { transaction },
    );
    otherMentor = await db.User.create(
      {
        email: `sched-other-${Date.now()}@test.com`,
        name: "OtherMentor",
        roles: ["Mentor"],
      },
      { transaction },
    );
    admin = await db.User.create(
      {
        email: `sched-admin-${Date.now()}@test.com`,
        name: "SchedAdmin",
        roles: ["MentorshipAdmin"],
      },
      { transaction },
    );
    const mentee = await db.User.create(
      {
        email: `sched-mentee-${Date.now()}@test.com`,
        name: "SchedMentee",
        roles: ["Mentee"],
      },
      { transaction },
    );
    await createMentorship(mentor.id, mentee.id, false, null, transaction);
    const mentorship = await db.Mentorship.findOne({
      where: { mentorId: mentor.id, menteeId: mentee.id },
      transaction,
    });
    invariant(mentorship, "mentorship must exist");
    mentorshipId = mentorship.id;
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should allow the assigned mentor to update schedule", async () => {
    const schedule = { week: 2, day: 3, hour: 19, minute: 30 };
    await updateMentorshipSchedule(mentor, mentorshipId, schedule, transaction);

    const updated = await db.Mentorship.findByPk(mentorshipId, { transaction });
    expect(updated?.schedule).to.deep.equal(schedule);
  });

  it("should allow a MentorshipAdmin to update schedule", async () => {
    const schedule = { week: 1, day: 5, hour: 20, minute: 0 };
    await updateMentorshipSchedule(admin, mentorshipId, schedule, transaction);

    const updated = await db.Mentorship.findByPk(mentorshipId, { transaction });
    expect(updated?.schedule).to.deep.equal(schedule);
  });

  it("should reject an unrelated mentor from updating schedule", async () => {
    const schedule = { week: 4, day: 6, hour: 10, minute: 0 };
    let errorThrown = false;
    try {
      await updateMentorshipSchedule(
        otherMentor,
        mentorshipId,
        schedule,
        transaction,
      );
    } catch (error) {
      errorThrown = true;
      void expect(error).to.have.property(
        "message",
        `您没有访问一对一匹配 ${mentorshipId} 的权限。`,
      );
    }
    void expect(errorThrown).to.be.true;
  });
});
