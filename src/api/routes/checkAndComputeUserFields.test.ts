import { expect } from "chai";
import { Transaction } from "sequelize";
import db from "../database/db";
import { checkAndComputeUserFields } from "./checkAndComputeUserFields";
import sequelize from "../database/sequelize";

describe("checkAndComputeUserFields", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  it("should throw error for invalid email", async () => {
    try {
      await checkAndComputeUserFields({
        email: "invalid-email",
        isVolunteerOrMentor: false,
        oldUrl: null,
        transaction,
      });
      expect.fail("Should throw error");
    } catch (e: any) {
      expect(e.message).to.include("Email地址无效");
    }
  });

  it("should lowercase valid email", async () => {
    const res = await checkAndComputeUserFields({
      email: "Test@EMAIL.com",
      isVolunteerOrMentor: false,
      oldUrl: null,
      transaction,
    });
    expect(res.email).to.equal("test@email.com");
  });

  it("should compute pinyin for name", async () => {
    const res = await checkAndComputeUserFields({
      name: "测试",
      isVolunteerOrMentor: false,
      oldUrl: null,
      transaction,
    });
    expect(res.name).to.equal("测试");
    expect(res.pinyin).to.equal("ceshi");
  });

  it("should handle null name", async () => {
    const res = await checkAndComputeUserFields({
      name: null,
      isVolunteerOrMentor: false,
      oldUrl: null,
      transaction,
    });
    expect(res.name).to.equal(null);
    expect(res.pinyin).to.equal(null);
  });

  it("should omit name/email/pinyin if undefined", async () => {
    const res = await checkAndComputeUserFields({
      isVolunteerOrMentor: false,
      oldUrl: null,
      transaction,
    });
    expect(res).to.not.have.property("name");
    expect(res).to.not.have.property("email");
    expect(res).to.not.have.property("pinyin");
  });

  describe("checkAndComputeUrl", () => {
    it("should throw error for invalid url format", async () => {
      try {
        await checkAndComputeUserFields({
          url: "Invalid-URL!",
          isVolunteerOrMentor: true,
          oldUrl: null,
          transaction,
        });
        expect.fail("Should throw error");
      } catch (e: any) {
        expect(e.message).to.include("用户URL格式无效");
      }
    });

    it("should return empty object if url equals oldUrl", async () => {
      const res = await checkAndComputeUserFields({
        url: "myurl",
        isVolunteerOrMentor: true,
        oldUrl: "myurl",
        transaction,
      });
      expect(res).to.not.have.property("url");
    });

    it("should throw error if users without isVolunteerOrMentor tries to set url", async () => {
      try {
        await checkAndComputeUserFields({
          url: "newurl",
          isVolunteerOrMentor: false,
          oldUrl: "oldurl",
          transaction,
        });
        expect.fail("Should throw error");
      } catch (e: any) {
        expect(e.message).to.include("没有设置URL的权限");
      }
    });

    it("should throw error if url is already taken", async () => {
      await db.User.create(
        { email: "1@test.com", name: "1", roles: [], url: "takenurl" },
        { transaction },
      );

      try {
        await checkAndComputeUserFields({
          url: "takenurl",
          isVolunteerOrMentor: true,
          oldUrl: null,
          transaction,
        });
        expect.fail("Should throw error");
      } catch (e: any) {
        expect(e.message).to.include("此用户URL已被注册");
      }
    });

    it("should set url if valid and available for users with isVolunteerOrMentor", async () => {
      const res = await checkAndComputeUserFields({
        url: "newurl",
        isVolunteerOrMentor: true,
        oldUrl: null,
        transaction,
      });
      expect(res.url).to.equal("newurl");
    });

    it("should retain old url if oldUrl is not null and url is undefined", async () => {
      const res = await checkAndComputeUserFields({
        isVolunteerOrMentor: true,
        oldUrl: "oldurl",
        transaction,
      });
      expect(res).to.not.have.property("url");
    });

    it("should not auto-generate url for users without isVolunteerOrMentors", async () => {
      const res = await checkAndComputeUserFields({
        isVolunteerOrMentor: false,
        oldUrl: null,
        transaction,
      });
      expect(res).to.not.have.property("url");
    });

    it("should auto-generate url for users with isVolunteerOrMentor with name", async () => {
      const res = await checkAndComputeUserFields({
        name: "测试",
        isVolunteerOrMentor: true,
        oldUrl: null,
        transaction,
      });
      expect(res.url).to.equal("ceshi");
    });

    it("should auto-generate url for users with isVolunteerOrMentor without name", async () => {
      const res = await checkAndComputeUserFields({
        isVolunteerOrMentor: true,
        oldUrl: null,
        transaction,
      });
      expect(res.url).to.equal("anonymous");
    });

    it("should append suffix if auto-generated url is taken", async () => {
      await db.User.create(
        { email: "1@test.com", name: "1", roles: [], url: "ceshi" },
        { transaction },
      );

      const res = await checkAndComputeUserFields({
        name: "测试",
        isVolunteerOrMentor: true,
        oldUrl: null,
        transaction,
      });
      expect(res.url).to.equal("ceshi2");
    });

    it("should append multiple suffixes if multiple urls are taken", async () => {
      await db.User.create(
        { email: "1@test.com", name: "1", roles: [], url: "anonymous" },
        { transaction },
      );
      await db.User.create(
        { email: "2@test.com", name: "2", roles: [], url: "anonymous2" },
        { transaction },
      );

      const res = await checkAndComputeUserFields({
        isVolunteerOrMentor: true,
        oldUrl: null,
        transaction,
      });
      expect(res.url).to.equal("anonymous3");
    });
  });
});
