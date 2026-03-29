import { expect } from "chai";
import { adapter } from "./adapter";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { v4 as uuidv4 } from "uuid";

describe("adapter", () => {
  describe("createUser", () => {
    it("should create a wechat user", async () => {
      await sequelize.transaction(async (transaction) => {
        const email = "o+up+f8u+mu+a+j+o_+m2pxb1+q9z+nj+we+s6o@wechat.fe";
        const user = await adapter.createUserImpl({ email }, transaction);
        expect(user).to.not.equal(null);
        expect((user as any).wechatUnionId).to.equal(
          "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o",
        );
        await transaction.rollback();
      });
    });

    it("should create an sso user without realEmail", async () => {
      await sequelize.transaction(async (transaction) => {
        const email = "sso+user+id+no+email@sso.fe";
        const user = await adapter.createUserImpl(
          {
            email,
          },
          transaction,
        );
        expect(user).to.not.equal(null);
        expect((user as any).ssoUserId).to.equal("ssoUserIdNoEmail");
        await transaction.rollback();
      });
    });

    it("should create an sso user", async () => {
      await sequelize.transaction(async (transaction) => {
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
        await transaction.rollback();
      });
    });

    it("should throw for invalid email domain", async () => {
      await sequelize.transaction(async (transaction) => {
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
        await transaction.rollback();
      });
    });
  });

  describe("getUserByEmail", () => {
    it("should return null for unknown email domain", async () => {
      await sequelize.transaction(async (transaction) => {
        const user = await adapter.getUserByEmailImpl(
          "unknown@example.com",
          transaction,
        );
        expect(user).to.equal(null);
        await transaction.rollback();
      });
    });

    it("should return user by wechat fake email", async () => {
      await sequelize.transaction(async (transaction) => {
        const wechatUnionId = "testWechat123";
        await db.User.create({ id: uuidv4(), wechatUnionId }, { transaction });

        const email = "test+wechat123@wechat.fe";
        const user = await adapter.getUserByEmailImpl(email, transaction);
        expect(user).to.not.equal(null);
        expect(user?.id).to.not.equal(null);
        expect((user as any).wechatUnionId).to.equal(wechatUnionId);

        await transaction.rollback();
      });
    });

    it("should return user by sso fake email", async () => {
      await sequelize.transaction(async (transaction) => {
        const ssoUserId = "testSso123";
        await db.User.create({ id: uuidv4(), ssoUserId }, { transaction });

        const email = "test+sso123@sso.fe";
        const user = await adapter.getUserByEmailImpl(email, transaction);
        expect(user).to.not.equal(null);
        expect(user?.id).to.not.equal(null);
        expect((user as any).ssoUserId).to.equal(ssoUserId);

        await transaction.rollback();
      });
    });

    it("should return null if user doesn't exist", async () => {
      await sequelize.transaction(async (transaction) => {
        const email = "nonexistent@wechat.fe";
        const user = await adapter.getUserByEmailImpl(email, transaction);
        expect(user).to.equal(null);

        await transaction.rollback();
      });
    });
  });
});
