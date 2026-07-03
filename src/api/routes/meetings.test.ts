import { expect } from "chai";
import { Transaction } from "sequelize";
import { getWhiteLabel } from "shared/getWhiteLabel";
import sequelize from "../database/sequelize";
import meetingSequelize from "../database/meetingSequelize";
import * as notifyModule from "../notify";
import * as tencentMeetingModule from "../TencentMeeting";
import sinon from "sinon";
import { recycleMeetings, refreshMeetingSlots } from "./meetings";

describe("recycleMeetings", () => {
  let transaction: Transaction;
  let meetingTransaction: Transaction;
  let notifyStub: sinon.SinonStub;
  let createMeetingStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    meetingTransaction = await meetingSequelize.transaction();

    sinon.stub(sequelize, "transaction").callsFake(async (cb) => {
      return await cb(transaction);
    });

    sinon.stub(meetingSequelize, "transaction").callsFake(async (cb) => {
      return await cb(meetingTransaction);
    });

    notifyStub = sinon.stub(notifyModule, "notifyRolesIgnoreError");
    sinon.stub(tencentMeetingModule, "getTmUserIds").resolves(["test-user-id"]);
    createMeetingStub = sinon.stub(
      tencentMeetingModule,
      "createRecurringMeeting",
    );
  });

  afterEach(async () => {
    sinon.restore();
    if (meetingTransaction) {
      await meetingTransaction.rollback();
    }
    if (transaction) {
      await transaction.rollback();
    }
  });

  it("should call notifyRolesIgnoreError when createRecurringMeeting throws a generic error", async () => {
    // Stub findOne to return a valid slot without a group, so it proceeds to create()
    const mockSlot = { groupId: null, update: sinon.stub().resolves() };
    sinon
      .stub(meetingSequelize.models.MeetingSlot, "findOne")
      .resolves(mockSlot as any);

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
    // Stub findOne to return a valid slot without a group, so it proceeds to create()
    const mockSlot = { groupId: null, update: sinon.stub().resolves() };
    sinon
      .stub(meetingSequelize.models.MeetingSlot, "findOne")
      .resolves(mockSlot as any);

    const errorMsg = "腾讯会议后台错误：每月总接口调用次数超过限制";
    createMeetingStub.rejects(new Error(errorMsg));

    await recycleMeetings();

    void expect(notifyStub.called).to.be.false;
  });
});

import db from "../database/db";

describe("refreshMeetingSlots", () => {
  let transaction: Transaction;
  let meetingTransaction: Transaction;
  let getMeetingStub: sinon.SinonStub;
  let clock: sinon.SinonFakeTimers;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    meetingTransaction = await meetingSequelize.transaction();

    getMeetingStub = sinon.stub(tencentMeetingModule, "getMeeting");
    clock = sinon.useFakeTimers(new Date().getTime());
  });

  afterEach(async () => {
    clock.restore();
    sinon.restore();
    await meetingTransaction.rollback();
    await transaction.rollback();
  });

  it("should ignore meetings created within the grace period", async () => {
    const groupId = "00000000-0000-0000-0000-000000000001";
    await meetingSequelize.models.MeetingSlot.create(
      {
        tmUserId: "test-user-id",
        meetingId: "meeting-1",
        meetingLink: "link",
        groupId,
        whiteLabel: getWhiteLabel(),
      },
      { transaction: meetingTransaction },
    );
    // updatedAt will be now, so it falls in the grace period

    await refreshMeetingSlots(transaction, meetingTransaction);

    void expect(getMeetingStub.called).to.be.false;
  });

  it("should ignore ongoing meetings", async () => {
    const groupId = "00000000-0000-0000-0000-000000000001";

    const slot = await meetingSequelize.models.MeetingSlot.create(
      {
        tmUserId: "test-user-id",
        meetingId: "meeting-2",
        meetingLink: "link",
        groupId,
        whiteLabel: getWhiteLabel(),
      },
      { transaction: meetingTransaction },
    );

    // Bypass grace period
    clock.tick(10 * 60 * 1000);

    getMeetingStub.resolves({ status: "MEETING_STATE_STARTED" });

    await refreshMeetingSlots(transaction, meetingTransaction);

    void expect(getMeetingStub.called).to.be.true;
    const updatedSlot = await meetingSequelize.models.MeetingSlot.findByPk(
      slot.dataValues.id,
      { transaction: meetingTransaction },
    );
    expect(updatedSlot?.dataValues.groupId).to.equal(groupId);
  });

  it("should end meetings that are not ongoing", async () => {
    const groupId = "00000000-0000-0000-0000-000000000001";
    const meetingId = "meeting-3";

    const slot = await meetingSequelize.models.MeetingSlot.create(
      {
        tmUserId: "test-user-id",
        meetingId,
        meetingLink: "link",
        groupId,
        whiteLabel: getWhiteLabel(),
      },
      { transaction: meetingTransaction },
    );

    // Bypass grace period
    clock.tick(10 * 60 * 1000);

    await db.MeetingHistory.create(
      {
        meetingId,
        groupId,
        endedBefore: null,
      },
      { transaction },
    );

    getMeetingStub.resolves({ status: "MEETING_STATE_ENDED" });

    await refreshMeetingSlots(transaction, meetingTransaction);

    void expect(getMeetingStub.called).to.be.true;

    const history = await db.MeetingHistory.findOne({
      where: { meetingId },
      transaction,
    });
    void expect(history?.endedBefore).to.not.be.null;

    const updatedSlot = await meetingSequelize.models.MeetingSlot.findByPk(
      slot.dataValues.id,
      { transaction: meetingTransaction },
    );
    void expect(updatedSlot?.dataValues.groupId).to.be.null;
  });
});
