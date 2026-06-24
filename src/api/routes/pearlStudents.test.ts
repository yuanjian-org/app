import { expect } from "chai";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";
import { validateImpl, uploadImpl } from "./pearlStudents";
import { menteeSourceField } from "../../shared/applicationFields";
import { displayName } from "../../shared/Role";

describe("pearlStudents API routes", () => {
  describe("uploadImpl", () => {
    afterEach(async () => {
      // Clean up manually created objects outside of transaction since uploadImpl opens its own transaction
      await db.PearlStudent.destroy({ where: {} });
    });

    it("should successfully insert new records", async () => {
      const csvData = "Name1,P001,1234\nName2,P002,5678";
      const result = await uploadImpl(csvData);

      expect(result.total).to.equal(2);
      expect(result.inserted).to.equal(2);
      expect(result.updated).to.equal(0);

      const students = await db.PearlStudent.findAll();
      expect(students.length).to.equal(2);
      expect(students[0].name).to.equal("Name1");
      expect(students[0].pearlId).to.equal("P001");
      expect(students[0].lowerCaseNationalIdLastFour).to.equal("1234");
      expect(students[1].name).to.equal("Name2");
      expect(students[1].pearlId).to.equal("P002");
      expect(students[1].lowerCaseNationalIdLastFour).to.equal("5678");
    });

    it("should successfully update existing records", async () => {
      await db.PearlStudent.create({
        pearlId: "P001",
        name: "OldName",
        lowerCaseNationalIdLastFour: "0000",
      });

      const csvData = "Name1,P001,1234\nName2,P002,5678";
      const result = await uploadImpl(csvData);

      expect(result.total).to.equal(2);
      expect(result.inserted).to.equal(1);
      expect(result.updated).to.equal(1);

      const student1 = await db.PearlStudent.findByPk("P001");
      expect(student1!.name).to.equal("Name1");
      expect(student1!.lowerCaseNationalIdLastFour).to.equal("1234");

      const student2 = await db.PearlStudent.findByPk("P002");
      expect(student2!.name).to.equal("Name2");
      expect(student2!.lowerCaseNationalIdLastFour).to.equal("5678");
    });

    it("should allow records without nationalIdLastFour", async () => {
      const csvData = "Name1,P001\nName2,P002,";
      const result = await uploadImpl(csvData);

      expect(result.total).to.equal(2);
      expect(result.inserted).to.equal(2);

      const student1 = await db.PearlStudent.findByPk("P001");
      void expect(student1!.lowerCaseNationalIdLastFour).to.be.null;

      const student2 = await db.PearlStudent.findByPk("P002");
      void expect(student2!.lowerCaseNationalIdLastFour).to.be.null;
    });

    it("should throw error if line is incomplete", async () => {
      const csvData = "Name1";
      try {
        await uploadImpl(csvData);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.equal("第1行数据不完整");
      }
    });

    it("should throw error if name or pearlId is missing", async () => {
      let csvData = ",P001,1234";
      try {
        await uploadImpl(csvData);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.equal("第1行：姓名和珍珠生编号不能为空");
      }

      csvData = "Name1,,1234";
      try {
        await uploadImpl(csvData);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.equal("第1行：姓名和珍珠生编号不能为空");
      }
    });

    it("should throw error if nationalIdLastFour is not 4 digits", async () => {
      const csvData = "Name1,P001,123";
      try {
        await uploadImpl(csvData);
        expect.fail("Should have thrown error");
      } catch (e: any) {
        expect(e.message).to.equal("第1行：身份证号最后四位必须是4位数字");
      }
    });

    it("should ignore empty lines", async () => {
      const csvData = "\nName1,P001,1234\n  \nName2,P002,5678\n";
      const result = await uploadImpl(csvData);

      expect(result.total).to.equal(2);
      expect(result.inserted).to.equal(2);
    });
  });

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
          "此珍珠生号已被验证。请联系" + displayName("UserAdmin") + "。",
        );
      }
    });
  });
});
