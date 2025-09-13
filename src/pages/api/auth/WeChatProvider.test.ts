import { expect } from "chai";
import {
  unionId2Email,
  email2UnionId,
  fakeEmailDomain,
} from "./WeChatProvider";

describe("WeChatProvider", () => {
  describe("unionId2Email", () => {
    it("should convert lowercase unionid to email", () => {
      const unionid = "test123";
      const expected = "test123@f.ml";
      expect(unionId2Email(unionid)).to.equal(expected);
    });

    it("should convert unionid with uppercase letters to email with plus signs", () => {
      const unionid = "Test123";
      const expected = "+Test123@f.ml";
      expect(unionId2Email(unionid)).to.equal(expected);
    });

    it("should throw error for empty unionid", () => {
      const unionid = "";
      expect(() => unionId2Email(unionid)).to.throw("尚未支持的微信账号ID格式");
    });

    it("should throw error when unionid contains plus sign", () => {
      const unionid = "test+123";
      expect(() => unionId2Email(unionid)).to.throw("尚未支持的微信账号ID格式");
    });
  });

  describe("email2UnionId", () => {
    it("should convert email with lowercase to unionid", () => {
      const email = "test123@f.ml";
      const expected = "test123";
      expect(email2UnionId(email)).to.equal(expected);
    });

    it("should convert email with plus signs to unionid with uppercase", () => {
      const email = "+Test123@f.ml";
      const expected = "Test123";
      expect(email2UnionId(email)).to.equal(expected);
    });

    it("should throw error when email doesn't end with fake domain", () => {
      const email = "test123@gmail.com";
      expect(() => email2UnionId(email)).to.throw(
        `email "${email}" doesn't end with ${fakeEmailDomain}`,
      );
    });
  });

  describe("roundtrip conversion", () => {
    it("should preserve unionid through email conversion roundtrip", () => {
      const originalUnionid = "TestUser123";
      const email = unionId2Email(originalUnionid);
      const convertedUnionid = email2UnionId(email);
      expect(convertedUnionid).to.equal(originalUnionid);
    });
  });
});
