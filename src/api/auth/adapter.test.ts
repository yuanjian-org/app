import { expect } from "chai";
import { adapter } from "./adapter";
import db from "../database/db";
import { v4 as uuidv4 } from "uuid";

describe("adapter", () => {
  beforeEach(async () => {
    await db.User.destroy({ where: {} });
  });

  afterEach(async () => {
    await db.User.destroy({ where: {} });
  });

  describe("createUser", () => {
    it("should create a wechat user", async () => {
      const email = "o+up+f8u+mu+a+j+o_+m2pxb1+q9z+nj+we+s6o@wechat.fe";
      const user = await adapter.createUser({ email });
      expect(user).to.exist;
      expect((user as any).wechatUnionId).to.equal(
        "oUpF8uMuAJO_M2pxb1Q9zNjWeS6o",
      );
    });

    it("should create an sso user without realEmail", async () => {
      const email = "sso+user+id+no+email@sso.fe";
      const user = await adapter.createUser({
        email,
      });
      expect(user).to.exist;
      expect((user as any).ssoUserId).to.equal("ssoUserIdNoEmail");
    });

    it("should create an sso user", async () => {
      const email = "sso+user+id123@sso.fe";
      const user = await adapter.createUser({
        email,
        realEmail: "real@test.com",
        name: "SSO User",
        phone: "1234567890",
      });
      expect(user).to.exist;
      expect((user as any).ssoUserId).to.equal("ssoUserId123");
      expect((user as any).email).to.equal("real@test.com");
      expect((user as any).name).to.equal("SSO User");
      expect((user as any).phone).to.equal("1234567890");
    });

    it("should throw for invalid email domain", async () => {
      let threw = false;
      try {
        await adapter.createUser({ email: "invalid@example.com" });
      } catch (err: any) {
        threw = true;
        expect(err.message).to.equal(
          "Invalid email domain for creation: invalid@example.com",
        );
      }
      expect(threw).to.be.true;
    });
  });

  describe("getUserByEmail", () => {
    it("should return null for unknown email domain", async () => {
      const user = await adapter.getUserByEmail("unknown@example.com");
      expect(user).to.be.null;
    });

    it("should return user by wechat fake email", async () => {
      const wechatUnionId = "testWechat123";
      await db.User.create({ id: uuidv4(), wechatUnionId });

      const email = "test+wechat123@wechat.fe";
      const user = await adapter.getUserByEmail(email);
      expect(user).to.exist;
      expect(user?.id).to.exist;
      expect((user as any).wechatUnionId).to.equal(wechatUnionId);
    });

    it("should return user by sso fake email", async () => {
      const ssoUserId = "testSso123";
      await db.User.create({ id: uuidv4(), ssoUserId });

      const email = "test+sso123@sso.fe";
      const user = await adapter.getUserByEmail(email);
      expect(user).to.exist;
      expect(user?.id).to.exist;
      expect((user as any).ssoUserId).to.equal(ssoUserId);
    });

    it("should return null if user doesn't exist", async () => {
      const email = "nonexistent@wechat.fe";
      const user = await adapter.getUserByEmail(email);
      expect(user).to.be.null;
    });
  });
});
