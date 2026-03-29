import { expect } from "chai";
import { adapter } from "./adapter";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { v4 as uuidv4 } from "uuid";
import { Transaction } from "sequelize";

describe("adapter", () => {
  let transaction: Transaction;

  beforeEach(async () => {
    transaction = await sequelize.transaction();
  });

  afterEach(async () => {
    await transaction.rollback();
  });

  describe("createUser", () => {
    it("should create a wechat user", async () => {
      const email = "o+up+f8u+mu+a+j+o_+m2pxb1+q9z+nj+we+s6o@wechat.fe";
      const user = await adapter.createUserImpl({ email }, transaction);
      expect(user).to.not.equal(null);
      expect((user as any).wechatUnionId).to.equal(
        "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o",
      );
    });

    it("should create an sso user without realEmail", async () => {
      const email = "sso+user+id+no+email@sso.fe";
      const user = await adapter.createUserImpl(
        {
          email,
        },
        transaction,
      );
      expect(user).to.not.equal(null);
      expect((user as any).ssoUserId).to.equal("ssoUserIdNoEmail");
    });

    it("should create an sso user", async () => {
      const email = "sso+user+id123@sso.fe";
      const user = await adapter.createUserImpl(
        {
          email,
          realEmail: "real@test.com",
          name: "SSO User",
          phone: "1234567890",
        },
        transaction,
      );
      expect(user).to.not.equal(null);
      expect((user as any).ssoUserId).to.equal("ssoUserId123");
      expect((user as any).email).to.equal("real@test.com");
      expect((user as any).name).to.equal("SSO User");
      expect((user as any).phone).to.equal("1234567890");
    });

    it("should throw for invalid email domain", async () => {
      let threw = false;
      try {
        await adapter.createUserImpl(
          { email: "invalid@example.com" },
          transaction,
        );
      } catch (err: any) {
        threw = true;
        expect(err.message).to.equal(
          "Invalid email domain for creation: invalid@example.com",
        );
      }
      expect(threw).to.equal(true);
    });
  });

  describe("getUserByEmail", () => {
    it("should return null for unknown email domain", async () => {
      const user = await adapter.getUserByEmailImpl(
        "unknown@example.com",
        transaction,
      );
      expect(user).to.equal(null);
    });

    it("should return user by wechat fake email", async () => {
      const wechatUnionId = "testWechat123";
      const id = uuidv4();
      await db.User.create({ id, wechatUnionId }, { transaction });

      const email = "test+wechat123@wechat.fe";
      const user = await adapter.getUserByEmailImpl(email, transaction);
      expect(user).to.not.equal(null);
      expect(user?.id).to.equal(id);
    });

    it("should return user by sso fake email", async () => {
      const ssoUserId = "testSso123";
      const id = uuidv4();
      await db.User.create({ id, ssoUserId }, { transaction });

      const email = "test+sso123@sso.fe";
      const user = await adapter.getUserByEmailImpl(email, transaction);
      expect(user).to.not.equal(null);
      expect(user?.id).to.equal(id);
    });

    it("should return null if user doesn't exist", async () => {
      const email = "nonexistent@wechat.fe";
      const user = await adapter.getUserByEmailImpl(email, transaction);
      expect(user).to.equal(null);
    });
  });
});
