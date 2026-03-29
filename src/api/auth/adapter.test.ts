import { expect } from "chai";
import { adapter } from "./adapter";
import db from "../database/db";
import { unionId2Email, ssoUserId2Email } from "./fakeEmail";

describe("adapter", () => {
  let createdUserIds: string[] = [];

  afterEach(async () => {
    // Cleanup users created during tests
    if (createdUserIds.length > 0) {
      await db.User.destroy({
        where: { id: createdUserIds },
        force: true,
      });
      createdUserIds = [];
    }
  });

  describe("createUser", () => {
    it("should create a user with a wechat unionId", async () => {
      const wechatUnionId = `testunionid${Date.now()}`;
      const email = unionId2Email(wechatUnionId);

      // The real createUser is expected to return something that we can use, but Sequelize
      // creation might return all fields.
      const user = await adapter.createUser({ email });
      createdUserIds.push(user.id);

      expect(user.wechatUnionId).to.equal(wechatUnionId);
      expect(user.ssoUserId).to.be.null;

      const dbUser = await db.User.findByPk(user.id);
      expect(dbUser?.wechatUnionId).to.equal(wechatUnionId);
    });

    it("should create a user with an ssoUserId and computed fields", async () => {
      const ssoUserId = `testssoid${Date.now()}`;
      const email = ssoUserId2Email(ssoUserId);
      const realEmail = `real${Date.now()}@example.com`;
      const name = "Test SSO User";
      const phone = "1234567890";

      const user = await adapter.createUser({
        email,
        realEmail,
        name,
        phone,
      });
      createdUserIds.push(user.id);

      expect(user.ssoUserId).to.equal(ssoUserId);
      expect(user.wechatUnionId).to.be.null;
      expect(user.email).to.equal(realEmail.toLowerCase());
      expect(user.name).to.equal(name);
      expect(user.phone).to.equal(phone);
      expect(user.pinyin).to.be.a("string");

      const dbUser = await db.User.findByPk(user.id);
      expect(dbUser?.ssoUserId).to.equal(ssoUserId);
      expect(dbUser?.email).to.equal(realEmail.toLowerCase());
    });

    it("should throw an error for an invalid email domain", async () => {
      let error: any;
      try {
        await adapter.createUser({ email: "invalid@example.com" });
      } catch (e) {
        error = e;
      }
      expect(error).to.exist;
      expect(error.message).to.include(
        "Invalid email domain for creation: invalid@example.com"
      );
    });
  });

  describe("getUserByEmail", () => {
    it("should get a user by wechat fake email", async () => {
      const wechatUnionId = `testunionidget${Date.now()}`;
      const user = await db.User.create({ wechatUnionId });
      createdUserIds.push(user.id);

      const email = unionId2Email(wechatUnionId);
      const fetchedUser = await adapter.getUserByEmail(email);

      expect(fetchedUser).to.not.be.null;
      expect(fetchedUser?.id).to.equal(user.id);
      // userAttributes does not include wechatUnionId, but it includes email
      // let's check id which is enough
    });

    it("should get a user by sso fake email", async () => {
      const ssoUserId = `testssoidget${Date.now()}`;
      const user = await db.User.create({ ssoUserId });
      createdUserIds.push(user.id);

      const email = ssoUserId2Email(ssoUserId);
      const fetchedUser = await adapter.getUserByEmail(email);

      expect(fetchedUser).to.not.be.null;
      expect(fetchedUser?.id).to.equal(user.id);
    });

    it("should return null for an invalid email domain", async () => {
      const fetchedUser = await adapter.getUserByEmail("invalid@example.com");
      expect(fetchedUser).to.be.null;
    });
  });
});
