import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import * as notifyModule from "../notify";
import * as tencentMeetingModule from "../TencentMeeting";
import sinon from "sinon";
import { recycleMeetings } from "./meetings";

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
