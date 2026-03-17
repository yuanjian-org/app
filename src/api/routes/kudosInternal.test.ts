import { expect } from "chai";
import createKudos from "./kudosInternal";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";

describe("Kudos Internal Functions", () => {
  let transaction: Transaction;
  let giver: any;
  let receiver: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    // Create test users
    giver = await db.User.create(
      {
        email: "giver@example.com",
        name: "Test Giver",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    receiver = await db.User.create(
      {
        email: "receiver@example.com",
        name: "Test Receiver",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );
  });

  afterEach(async () => {
    if (transaction) await transaction.rollback();
  });

  describe("createKudos", () => {
    it("should successfully create a 'like' and increment receiver's likes count", async () => {
      await createKudos(giver.id, receiver.id, null, transaction);

      const updatedReceiver = await db.User.findByPk(receiver.id, {
        transaction,
      });

      expect(updatedReceiver?.likes).to.equal(1);
      expect(updatedReceiver?.kudos).to.equal(0);

      const kudosRecord = await db.Kudos.findOne({
        where: { giverId: giver.id, receiverId: receiver.id },
        transaction,
      });

      void expect(kudosRecord).to.not.be.null;
      void expect(kudosRecord?.text).to.be.null;
    });

    it("should successfully create a 'kudos' and increment receiver's kudos count", async () => {
      const kudosText = "Great job!";
      await createKudos(giver.id, receiver.id, kudosText, transaction);

      const updatedReceiver = await db.User.findByPk(receiver.id, {
        transaction,
      });

      expect(updatedReceiver?.likes).to.equal(0);
      expect(updatedReceiver?.kudos).to.equal(1);

      const kudosRecord = await db.Kudos.findOne({
        where: { giverId: giver.id, receiverId: receiver.id },
        transaction,
      });

      void expect(kudosRecord).to.not.be.null;
      expect(kudosRecord?.text).to.equal(kudosText);
    });

    it("should throw a generalBadRequestError if a user tries to send kudos to themselves", async () => {
      try {
        await createKudos(giver.id, giver.id, null, transaction);
        expect.fail("Expected createKudos to throw an error");
      } catch (err: any) {
        expect(err.name).to.equal("TRPCError");
        expect(err.code).to.equal("BAD_REQUEST");
        expect(err.message).to.equal("User cannot send kudos to themselves");
      }
    });

    it("should throw a notFoundError if the receiver does not exist", async () => {
      const nonExistentId = "non-existent-id";
      try {
        await createKudos(giver.id, nonExistentId, null, transaction);
        expect.fail("Expected createKudos to throw an error");
      } catch (err: any) {
        expect(err.name).to.equal("TRPCError");
        expect(err.code).to.equal("NOT_FOUND");
        expect(err.message).to.equal("找不到目标：用户 non-existent-id");
      }
    });
  });
});
