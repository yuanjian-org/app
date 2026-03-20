import { expect } from "chai";
import sinon from "sinon";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { createMentorBooking } from "./mentorBookings";
import * as chatsInternal from "./chatsInternal";
import * as chats from "./chats";
import * as notify from "../notify";
describe("Mentor Bookings Router", () => {
  let transaction: Transaction;
  let requester: any;
  let findOrCreateRoomStub: sinon.SinonStub;
  let createMessageAndScheduleEmailStub: sinon.SinonStub;
  let notifyRolesStub: sinon.SinonStub;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    requester = await db.User.create(
      {
        email: "requester@example.com",
        name: "Test Requester",
        roles: [],
      },
      { transaction },
    );

    manager = await db.User.create(
      {
        email: "manager@example.com",
        name: "Test Manager",
        roles: ["MentorshipManager"],
      },
      { transaction },
    );

    findOrCreateRoomStub = sinon
      .stub(chatsInternal, "findOrCreateRoom")
      .resolves({ id: "test-room-id" } as any);
    createMessageAndScheduleEmailStub = sinon
      .stub(chats, "createMessageAndScheduleEmail")
      .resolves();
    notifyRolesStub = sinon.stub(notify, "notifyRoles").resolves();
  });

  afterEach(async () => {
    sinon.restore();
    if (transaction) {
      await transaction.rollback();
    }
  });

  describe("createMentorBooking", () => {
    it("should successfully create a mentor booking and notify roles", async () => {
      await createMentorBooking(requester, null, "Test topic", transaction);

      // Verify the database record
      const bookings = await db.MentorBooking.findAll({
        where: { requesterId: requester.id },
        transaction,
      });

      expect(bookings).to.have.lengthOf(1);
      expect(bookings[0].topic).to.equal("Test topic");
      void expect(bookings[0].requestedMentorId).to.be.null;

      // Verify stubs were called
      void expect(findOrCreateRoomStub.calledOnce).to.be.true;
      void expect(createMessageAndScheduleEmailStub.calledOnce).to.be.true;
      void expect(notifyRolesStub.calledOnce).to.be.true;

      const notifyArgs = notifyRolesStub.firstCall.args;
      expect(notifyArgs[0]).to.deep.equal([
        "MentorshipManager",
        "MentorshipOperator",
      ]);
      expect(notifyArgs[1]).to.equal("不定期导师预约请求");
      expect(notifyArgs[2]).to.include("请访问");
    });
  });
});
