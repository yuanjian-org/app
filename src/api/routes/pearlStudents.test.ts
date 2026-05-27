import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { validateImpl } from "./pearlStudents";
import { menteeSourceField } from "../../shared/applicationFields";
import { displayName } from "../../shared/Role";

describe("pearlStudents API routes", () => {
  describe("validateImpl", () => {
    let transaction: Transaction;
    let testUser: any;

    beforeEach(async () => {
      transaction = await sequelize.transaction();
      testUser = await db.User.create(
        {
          email: "test@example.com",
          name: "Old Name",
          roles: [],
          likes: 0,
          kudos: 0,
          menteeApplication: {},
        },
        { transaction },
      );
      await db.PearlStudent.create(
        {
          pearlId: "P123",
          name: "Test Pearl",
          lowerCaseNationalIdLastFour: "1234",
        },
        { transaction },
      );
    });

    afterEach(async () => {
      if (transaction) await transaction.rollback();
    });

    it("should successfully validate a matching pearl student and update user fields", async () => {
      await validateImpl(
        testUser,
        "Test Pearl",
        "P123",
        "1234",
        "wechat123",
        transaction,
      );
      const student = await db.PearlStudent.findOne({
        where: { pearlId: "P123" },
        transaction,
      });
      expect(student!.userId).to.equal(testUser.id);
      const user = await db.User.findByPk(testUser.id, { transaction });
      expect(user!.roles).to.include("Mentee");
      expect(user!.name).to.equal("Test Pearl");
      expect(user!.wechat).to.equal("wechat123");
      expect(user!.menteeApplication[menteeSourceField]).to.equal(
        "珍珠生：P123",
      );
    });

    it("should throw error if student details do not match", async () => {
      try {
        await validateImpl(
          testUser,
          "Wrong Name",
          "P123",
          "1234",
          "wechat123",
          transaction,
        );
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.equal("珍珠生信息不匹配。");
      }
    });

    it("should throw error if pearl student is already verified", async () => {
      const dummyUser = await db.User.create(
        {
          email: "dummy@example.com",
          name: "Dummy",
          roles: [],
          likes: 0,
          kudos: 0,
          menteeApplication: {},
        },
        { transaction },
      );
      await db.PearlStudent.update(
        { userId: dummyUser.id },
        { where: { pearlId: "P123" }, transaction },
      );
      try {
        await validateImpl(
          testUser,
          "Test Pearl",
          "P123",
          "1234",
          "wechat123",
          transaction,
        );
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.equal(
          "此珍珠生号已被验证。请联系" + displayName("UserManager") + "。",
        );
      }
    });
  });
});
