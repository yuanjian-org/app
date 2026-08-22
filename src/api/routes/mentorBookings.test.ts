import { expect } from "chai";
import sinon from "sinon";
import { Transaction } from "sequelize";
import db from "../database/db";
import sequelize from "../database/sequelize";
import {
  createMentorBooking,
  listMentorBookings,
  updateMentorBooking,
} from "./mentorBookings";
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
        "MentorshipAdmin",
        "MentorshipOperator",
      ]);
      expect(notifyArgs[1]).to.equal("不定期导师预约请求");
      expect(notifyArgs[2]).to.include("请访问");
    });

    it("should successfully create a mentor booking with a requested mentor and notify roles", async () => {
      const mentor = await db.User.create(
        {
          email: "mentor@example.com",
          name: "Test Mentor",
          roles: ["Mentor"],
        },
        { transaction },
      );

      await createMentorBooking(
        requester,
        mentor.id,
        "Test topic",
        transaction,
      );

      // Verify the database record
      const bookings = await db.MentorBooking.findAll({
        where: { requesterId: requester.id },
        transaction,
      });

      expect(bookings).to.have.lengthOf(1);
      expect(bookings[0].topic).to.equal("Test topic");
      expect(bookings[0].requestedMentorId).to.equal(mentor.id);

      // Verify stubs were called
      void expect(findOrCreateRoomStub.calledOnce).to.be.true;
      void expect(createMessageAndScheduleEmailStub.calledOnce).to.be.true;
      void expect(notifyRolesStub.calledOnce).to.be.true;
    });
  });

  describe("list", () => {
    it("should list all mentor bookings", async () => {
      // Count existing bookings before creating a new one
      const before = await listMentorBookings(transaction);

      await db.MentorBooking.create(
        {
          requesterId: requester.id,
          topic: "List test topic",
        },
        { transaction },
      );

      const result = await listMentorBookings(transaction);
      // Verify exactly one new booking was added
      expect(result).to.have.lengthOf(before.length + 1);
      const match = result.find(
        (b: { topic: string }) =>
          b.topic === "List test topic",
      );
      expect(match).to.not.be.undefined;
    });
  });

  describe("update", () => {
    let admin: any;

    beforeEach(async () => {
      admin = await db.User.create(
        {
          email: "admin-update@example.com",
          name: "Test Admin",
          roles: ["MentorshipAdmin"],
        },
        { transaction },
      );
    });

    it("should update mentor booking notes and assignedMentorId", async () => {
      const mentor = await db.User.create(
        {
          email: "assigned-mentor@example.com",
          name: "Assigned Mentor",
          roles: ["Mentor"],
        },
        { transaction },
      );

      const booking = await db.MentorBooking.create(
        {
          requesterId: requester.id,
          topic: "Update test topic",
        },
        { transaction },
      );

      await updateMentorBooking(
        admin,
        booking.id,
        "Updated notes",
        mentor.id,
        transaction,
      );

      const updatedBooking = await db.MentorBooking.findByPk(booking.id, {
        transaction,
      });
      expect(updatedBooking?.notes).to.equal("Updated notes");
      expect(updatedBooking?.assignedMentorId).to.equal(mentor.id);
      expect(updatedBooking?.updaterId).to.equal(admin.id);
    });

    it("should throw notFoundError if mentor booking does not exist", async () => {
      try {
        await updateMentorBooking(
          admin,
          "00000000-0000-4000-8000-000000000000",
          "Notes",
          null,
          transaction,
        );
        expect.fail("Expected notFoundError to be thrown");
      } catch (err: any) {
        expect(err.message).to.include("不存在");
      }
    });
  });
});
