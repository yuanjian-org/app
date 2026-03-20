import { expect } from "chai";
import sinon from "sinon";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { refreshMeetingSlots, gracePeriodMinutes, recycleMeetings } from "./meetings";
import * as TencentMeeting from "../TencentMeeting";
import moment from "moment";
import * as notifyModule from "../notify";
import * as tencentMeetingModule from "../TencentMeeting";

describe("refreshMeetingSlots", () => {
  let transaction: Transaction;
  let getMeetingStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    getMeetingStub = sinon.stub(TencentMeeting, "getMeeting");
  });

  afterEach(async () => {
    sinon.restore();
    if (transaction) {
      await transaction.rollback();
    }
  });

  it("should not modify slot within grace period", async () => {
    const group = await db.Group.create(
      { name: "Test Group", public: true },
      { transaction },
    );

    const slot = await db.MeetingSlot.create(
      {
        tmUserId: "tmUserId1",
        meetingId: "meetingId1",
        meetingLink: "link1",
        groupId: group.id,
      },
      { transaction },
    );

    await sequelize.query(
      `UPDATE "MeetingSlots" SET "updatedAt" = :date WHERE id = :id`,
      {
        replacements: { date: moment().toISOString(), id: slot.id },
        transaction,
      },
    );

    await refreshMeetingSlots(transaction);

    const updatedSlot = await db.MeetingSlot.findByPk(slot.id, { transaction });
    expect(updatedSlot?.groupId).to.equal(group.id);
    void expect(getMeetingStub.called).to.be.false;
  });

  it("should ignore ongoing meetings", async () => {
    const group = await db.Group.create(
      { name: "Test Group", public: true },
      { transaction },
    );

    const slot = await db.MeetingSlot.create(
      {
        tmUserId: "tmUserId2",
        meetingId: "meetingId2",
        meetingLink: "link2",
        groupId: group.id,
      },
      { transaction },
    );

    await sequelize.query(
      `UPDATE "MeetingSlots" SET "updatedAt" = :date WHERE id = :id`,
      {
        replacements: {
          date: moment()
            .subtract(gracePeriodMinutes + 1, "minutes")
            .toISOString(),
          id: slot.id,
        },
        transaction,
      },
    );

    getMeetingStub.resolves({ status: "MEETING_STATE_STARTED" });

    await refreshMeetingSlots(transaction);

    const updatedSlot = await db.MeetingSlot.findByPk(slot.id, { transaction });
    expect(updatedSlot?.groupId).to.equal(group.id);
    void expect(getMeetingStub.called).to.be.true;
  });

  it("should end meeting and free slot when meeting has ended", async () => {
    const group = await db.Group.create(
      { name: "Test Group", public: true },
      { transaction },
    );

    const slot = await db.MeetingSlot.create(
      {
        tmUserId: "tmUserId3",
        meetingId: "meetingId3",
        meetingLink: "link3",
        groupId: group.id,
      },
      { transaction },
    );

    await sequelize.query(
      `UPDATE "MeetingSlots" SET "updatedAt" = :date WHERE id = :id`,
      {
        replacements: {
          date: moment()
            .subtract(gracePeriodMinutes + 1, "minutes")
            .toISOString(),
          id: slot.id,
        },
        transaction,
      },
    );

    const history = await db.MeetingHistory.create(
      {
        meetingId: slot.meetingId,
        groupId: group.id,
        endedBefore: null,
      },
      { transaction },
    );

    getMeetingStub.resolves({ status: "MEETING_STATE_ENDED" });

    await refreshMeetingSlots(transaction);

    const updatedSlot = await db.MeetingSlot.findByPk(slot.id, { transaction });
    void expect(updatedSlot?.groupId).to.be.null;

    const updatedHistory = await db.MeetingHistory.findByPk(history.id, {
      transaction,
    });
    void expect(updatedHistory?.endedBefore).to.not.be.null;

    void expect(getMeetingStub.called).to.be.true;
  });
});

describe("recycleMeetings", () => {
  let transaction: Transaction;
  let notifyStub: sinon.SinonStub;
  let createMeetingStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    notifyStub = sinon.stub(notifyModule, "notifyRolesIgnoreError");
    sinon.stub(tencentMeetingModule, "getTmUserIds").returns(["test-user-id"]);
    createMeetingStub = sinon.stub(
      tencentMeetingModule,
      "createRecurringMeeting",
    );
  });

  afterEach(async () => {
    if (transaction) {
      await transaction.rollback();
    }
    sinon.restore();
  });

  it("should call notifyRolesIgnoreError when createRecurringMeeting throws a generic error", async () => {
    const errorMsg = "some generic error";
    createMeetingStub.rejects(new Error(errorMsg));

    await recycleMeetings();

    void expect(notifyStub.called).to.be.true;
    expect(notifyStub.firstCall.args[0]).to.deep.equal([
      "SystemAlertSubscriber",
    ]);
    expect(notifyStub.firstCall.args[1]).to.equal("会议创建失败");
    expect(notifyStub.firstCall.args[2]).to.include(errorMsg);
  });

  it("should not call notifyRolesIgnoreError when the error includes '每月总接口调用次数超过限制'", async () => {
    const errorMsg = "腾讯会议后台错误：每月总接口调用次数超过限制";
    createMeetingStub.rejects(new Error(errorMsg));

    await recycleMeetings();

    void expect(notifyStub.called).to.be.false;
  });
});
