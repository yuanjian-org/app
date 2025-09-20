import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import * as notifyModule from "../notify";
import moment from "moment";
import sinon from "sinon";
import { auditLastMentorshipMeetings } from "./mentorships";
import invariant from "shared/invariant";
import { oneOnOneYellowThreshold } from "shared/Mentorship";

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
        transcriptId: `test-transcript-${Date.now()}`,
        groupId: group.id,
        startedAt: oldMeetingDate,
        endedAt: moment(oldMeetingDate).add(1, "hour").toDate(),
      },
      { transaction },
    );

    await auditLastMentorshipMeetings(transaction);

    // Verify notify was called with correct parameters
    // The function processes all mentorships with old meetings, so we expect multiple calls
    void expect(notifyStub.called).to.be.true;

    // Find the call for our specific mentorship
    const ourMentorshipCall = notifyStub
      .getCalls()
      .find((call) => call.args[1].includes(mentor.id));

    invariant(ourMentorshipCall, "call to notify was not found");
    expect(ourMentorshipCall.args[0]).to.equal("一对一通话提醒");
    expect(ourMentorshipCall.args[1]).to.include(mentor.id);
    expect(ourMentorshipCall.args[3]).to.have.property("days");
  });
});
