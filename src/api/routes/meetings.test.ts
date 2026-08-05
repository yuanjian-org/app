import { whiteLabel } from "shared/WhiteLabel";
import { expect } from "chai";
import { Transaction } from "sequelize";
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
        whiteLabel,
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
        whiteLabel,
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
        whiteLabel,
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

import router from "./meetings";

describe("meetings API", () => {
  let transaction: Transaction;
  let meetingTransaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
    meetingTransaction = await meetingSequelize.transaction();

    sinon.stub(sequelize, "transaction").callsFake((async (cb: any) => {
      return await cb(transaction);
    }) as any);

    sinon.stub(meetingSequelize, "transaction").callsFake((async (cb: any) => {
      return await cb(meetingTransaction);
    }) as any);
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

  describe("join", () => {
    let mockCaller: any;
    let originalEnv: any;

    beforeEach(() => {
      originalEnv = process.env.TM_SECRET_KEY;
      process.env.TM_SECRET_KEY = "dummy_secret_key";
      mockCaller = router.createCaller({
        me: { id: "user-1", name: "User One", roles: [] } as any,
        req: {} as any,
        res: {} as any,
      });
    });

    afterEach(() => {
      process.env.TM_SECRET_KEY = originalEnv;
    });

    it("should throw notFoundError if group is not found", async () => {
      let error: any;
      try {
        await mockCaller.join({
          groupId: "00000000-0000-0000-0000-000000000000",
        });
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal("NOT_FOUND");
    });

    it("should throw notPermittedError if user lacks permission", async () => {
      const g = await db.Group.create(
        {
          name: "test group",
          public: false,
          archived: false,
        },
        { transaction },
      );

      let error: any;
      try {
        await mockCaller.join({ groupId: g.id });
      } catch (e) {
        error = e;
      }
      expect(error.code).to.equal("FORBIDDEN");
    });

    it("should return /fake-meeting if TM_SECRET_KEY is not set", async () => {
      process.env.TM_SECRET_KEY = "";
      const mentor = await db.User.create(
        { email: "m@t.com", name: "m", roles: ["Mentor"] },
        { transaction },
      );
      const g = await db.Group.create(
        {
          name: "test group",
          public: false,
          archived: false,
        },
        { transaction },
      );
      await db.GroupUser.create(
        { groupId: g.id, userId: mentor.id },
        { transaction },
      );

      const caller = router.createCaller({
        me: mentor as any,
        req: {} as any,
        res: {} as any,
      });

      const res = await caller.join({ groupId: g.id });
      expect(res).to.equal("/fake-meeting");
    });

    it("should return existing meetingLink if group already has a slot", async () => {
      const mentor = await db.User.create(
        { email: "m2@t.com", name: "m2", roles: ["Mentor"] },
        { transaction },
      );
      const g = await db.Group.create(
        {
          name: "test group",
          public: false,
          archived: false,
        },
        { transaction },
      );
      await db.GroupUser.create(
        { groupId: g.id, userId: mentor.id },
        { transaction },
      );

      await meetingSequelize.models.MeetingSlot.create(
        {
          tmUserId: "tm-1",
          meetingId: "meeting-1",
          meetingLink: "https://meeting.link/1",
          groupId: g.id,
          whiteLabel,
        },
        { transaction: meetingTransaction },
      );

      const caller = router.createCaller({
        me: mentor as any,
        req: {} as any,
        res: {} as any,
      });

      const res = await caller.join({ groupId: g.id });
      expect(res).to.equal("https://meeting.link/1");
    });

    it("should assign a free slot and return meetingLink if one is available", async () => {
      const mentor = await db.User.create(
        { email: "m3@t.com", name: "m3", roles: ["Mentor"] },
        { transaction },
      );
      const g = await db.Group.create(
        {
          name: "test group",
          public: false,
          archived: false,
        },
        { transaction },
      );
      await db.GroupUser.create(
        { groupId: g.id, userId: mentor.id },
        { transaction },
      );

      await meetingSequelize.models.MeetingSlot.create(
        {
          tmUserId: "tm-2",
          meetingId: "meeting-2",
          meetingLink: "https://meeting.link/2",
          groupId: null,
          whiteLabel: null,
        },
        { transaction: meetingTransaction },
      );

      const caller = router.createCaller({
        me: mentor as any,
        req: {} as any,
        res: {} as any,
      });

      const res = await caller.join({ groupId: g.id });
      expect(res).to.equal("https://meeting.link/2");

      const slot = await meetingSequelize.models.MeetingSlot.findOne({
        where: { meetingId: "meeting-2" },
        transaction: meetingTransaction,
      });
      expect((slot as any).groupId).to.equal(g.id);
      expect((slot as any).whiteLabel).to.equal(whiteLabel);

      const history = await db.MeetingHistory.findOne({
        where: { meetingId: "meeting-2" },
        transaction,
      });
      expect(history?.groupId).to.equal(g.id);
    });

    it("should refresh meeting slots if none are free initially and then assign one", async () => {
      const mentor = await db.User.create(
        { email: "m4@t.com", name: "m4", roles: ["Mentor"] },
        { transaction },
      );
      const g = await db.Group.create(
        {
          name: "test group",
          public: false,
          archived: false,
        },
        { transaction },
      );
      await db.GroupUser.create(
        { groupId: g.id, userId: mentor.id },
        { transaction },
      );

      // Create a slot occupied by someone else but meeting is already ended
      await meetingSequelize.models.MeetingSlot.create(
        {
          tmUserId: "tm-3",
          meetingId: "meeting-3",
          meetingLink: "https://meeting.link/3",
          groupId: "other-group-id",
          whiteLabel,
          updatedAt: new Date(Date.now() - 10 * 60 * 1000), // Older than grace period
        },
        { transaction: meetingTransaction },
      );

      await db.MeetingHistory.create(
        {
          meetingId: "meeting-3",
          groupId: "other-group-id",
        },
        { transaction },
      );

      // Mock getMeeting to return ended status so refresh frees up the slot
      const getMeetingStub = sinon
        .stub(tencentMeetingModule, "getMeeting")
        .resolves({ status: "MEETING_STATE_ENDED" } as any);

      const caller = router.createCaller({
        me: mentor as any,
        req: {} as any,
        res: {} as any,
      });

      const res = await caller.join({ groupId: g.id });
      expect(res).to.equal("https://meeting.link/3");

      const slot = await meetingSequelize.models.MeetingSlot.findOne({
        where: { meetingId: "meeting-3" },
        transaction: meetingTransaction,
      });
      expect((slot as any).groupId).to.equal(g.id);
      getMeetingStub.restore();
    });

    it("should call notifyRolesIgnoreError and return null if no slots are available even after refreshing", async () => {
      const mentor = await db.User.create(
        { email: "m5@t.com", name: "m5", roles: ["Mentor"] },
        { transaction },
      );
      const g = await db.Group.create(
        {
          name: "test group",
          public: false,
          archived: false,
        },
        { transaction },
      );
      await db.GroupUser.create(
        { groupId: g.id, userId: mentor.id },
        { transaction },
      );

      // Create a slot occupied by someone else but meeting is ongoing
      await meetingSequelize.models.MeetingSlot.create(
        {
          tmUserId: "tm-4",
          meetingId: "meeting-4",
          meetingLink: "https://meeting.link/4",
          groupId: "other-group-id",
          whiteLabel,
          updatedAt: new Date(Date.now() - 10 * 60 * 1000), // Older than grace period
        },
        { transaction: meetingTransaction },
      );

      const getMeetingStub = sinon
        .stub(tencentMeetingModule, "getMeeting")
        .resolves({ status: "MEETING_STATE_STARTED" } as any);
      const notifyStub = sinon.stub(notifyModule, "notifyRolesIgnoreError");

      const caller = router.createCaller({
        me: mentor as any,
        req: {} as any,
        res: {} as any,
      });

      const res = await caller.join({ groupId: g.id });
      void expect(res).to.be.null;

      void expect(notifyStub.called).to.be.true;
      expect(notifyStub.firstCall.args[0]).to.deep.equal([
        "SystemAlertSubscriber",
      ]);
      expect(notifyStub.firstCall.args[1]).to.equal("超过并发会议上限");

      getMeetingStub.restore();
      notifyStub.restore();
    });
  });

  describe("decline", () => {
    it("should notify MentorshipAdmin using notifyRoles", async () => {
      const notifyStub = sinon.stub(notifyModule, "notifyRoles");
      const mentor = await db.User.create(
        { email: "d1@t.com", name: "decliner", roles: ["Mentor"] },
        { transaction },
      );

      const caller = router.createCaller({
        me: mentor as any,
        req: {} as any,
        res: {} as any,
      });

      await caller.decline();

      void expect(notifyStub.called).to.be.true;
      expect(notifyStub.firstCall.args[0]).to.deep.equal(["MentorshipAdmin"]);
      expect(notifyStub.firstCall.args[1]).to.equal("用户拒绝使用会议功能");
      expect(notifyStub.firstCall.args[2]).to.include("decliner");
      expect(notifyStub.firstCall.args[2]).to.include(mentor.id);
      expect(notifyStub.firstCall.args[3]).to.equal(transaction);

      notifyStub.restore();
    });
  });
});
