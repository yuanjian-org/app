import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { listKudosImpl, getLastKudosCreatedAtImpl } from "./kudos";
import createKudos from "./kudosInternal";
import moment from "moment";

describe("kudos routes", () => {
  let transaction: Transaction;
  let giver1: any;
  let giver2: any;
  let receiver1: any;

  beforeEach(async () => {
    transaction = await sequelize.transaction();

    giver1 = await db.User.create(
      {
        email: `giver1-${Date.now()}@example.com`,
        name: "Test Giver 1",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    giver2 = await db.User.create(
      {
        email: `giver2-${Date.now()}@example.com`,
        name: "Test Giver 2",
        roles: [],
        likes: 0,
        kudos: 0,
      },
      { transaction },
    );

    receiver1 = await db.User.create(
      {
        email: `receiver1-${Date.now()}@example.com`,
        name: "Test Receiver 1",
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

  describe("listKudosImpl", () => {
    it("should list kudos for a specific user, sorted by createdAt in descending order", async () => {
      await createKudos(giver1.id, receiver1.id, "First kudos", transaction);
      await createKudos(giver2.id, receiver1.id, "Second kudos", transaction);

      const receiverKudosList = await db.Kudos.findAll({
        where: { receiverId: receiver1.id },
        transaction,
      });

      await receiverKudosList[0].update(
        { createdAt: moment().subtract(1, "days").toDate() },
        { transaction },
      );
      await receiverKudosList[1].update(
        { createdAt: moment().toDate() },
        { transaction },
      );

      const result = await listKudosImpl(receiver1.id, undefined, transaction);

      expect(result.length).to.equal(2);
      expect(result[0].text).to.equal("Second kudos");
      expect(result[1].text).to.equal("First kudos");
    });

    it("should limit the results", async () => {
      await createKudos(giver1.id, receiver1.id, "First kudos", transaction);
      await createKudos(giver2.id, receiver1.id, "Second kudos", transaction);

      const result = await listKudosImpl(receiver1.id, 1, transaction);

      expect(result.length).to.equal(1);
    });

    it("should return all kudos when userId is not provided", async () => {
      await createKudos(giver1.id, receiver1.id, "First kudos", transaction);

      const receiver2 = await db.User.create(
        {
          email: `receiver2-${Date.now()}@example.com`,
          name: "Test Receiver 2",
          roles: [],
          likes: 0,
          kudos: 0,
        },
        { transaction },
      );
      await createKudos(giver1.id, receiver2.id, "Second kudos", transaction);

      const result = await listKudosImpl(undefined, undefined, transaction);

      expect(result.length).to.be.greaterThanOrEqual(2);
      const texts = result.map((k) => k.text);
      expect(texts).to.include("First kudos");
      expect(texts).to.include("Second kudos");
    });
  });

  describe("getLastKudosCreatedAtImpl", () => {
    it("should exclude kudos given by the current user", async () => {
      await createKudos(giver1.id, receiver1.id, "First kudos", transaction);

      const kudosList = await db.Kudos.findAll({
        where: { giverId: giver1.id },
        transaction,
      });
      const expectedTime = moment().subtract(1, "hours").toDate();
      await sequelize.query(
        `UPDATE "Kudos" SET "createdAt" = :time WHERE id = :id`,
        {
          replacements: { time: expectedTime, id: kudosList[0].id },
          transaction,
        },
      );

      const dateForGiver2 = await getLastKudosCreatedAtImpl(
        giver2.id,
        transaction,
      );
      expect(moment(dateForGiver2).toISOString()).to.equal(
        moment(expectedTime).toISOString(),
      );

      const dateForGiver1 = await getLastKudosCreatedAtImpl(
        giver1.id,
        transaction,
      );
      expect(moment(dateForGiver1).toISOString()).to.not.equal(
        moment(expectedTime).toISOString(),
      );
    });
  });
});
