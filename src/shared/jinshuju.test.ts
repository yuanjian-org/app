import { expect } from "chai";
import { encodeXField, validateAndDecodeXField } from "./jinshuju";

describe("jinshuju", () => {
  describe("encodeXField", () => {
    it("should encode correctly when user has a url and target", () => {
      const result = encodeXField(
        "yuantu",
        "test-user",
        "UserProfilePicture",
        "user-id-1",
        "hmac-val",
      );
      expect(result).to.equal(
        "yuantu,test-user,UserProfilePicture,user-id-1,hmac-val",
      );
    });

    it("should encode correctly when user url is null and target is null", () => {
      const result = encodeXField(
        "yuantu",
        null,
        null,
        "user-id-2",
        "hmac-val2",
      );
      expect(result).to.equal("yuantu,,,user-id-2,hmac-val2");
    });

    it("should encode correctly when user url is empty and target is null", () => {
      const result = encodeXField("yuantu", "", null, "user-id-3", "hmac-val3");
      expect(result).to.equal("yuantu,,,user-id-3,hmac-val3");
    });
  });

  describe("validateAndDecodeXField", () => {
    it("should decode correctly when x_field_1 has a valid tenant, target, userId, and hmac", () => {
      const formEntry = {
        x_field_1: "yuantu,test-user,UserProfilePicture,user-id-1,hmac-val",
      };
      const result = validateAndDecodeXField("yuantu", formEntry);
      expect(result).to.deep.equal({
        userUrl: "test-user",
        target: "UserProfilePicture",
        userId: "user-id-1",
        hmac: "hmac-val",
      });
    });

    it("should decode correctly when x_field_1 has a valid tenant, empty target, userId, and multiple commas in hmac", () => {
      const formEntry = {
        x_field_1: "yuantu,test-user,,user-id-2,hmac-val,extra",
      };
      const result = validateAndDecodeXField("yuantu", formEntry);
      expect(result).to.deep.equal({
        userUrl: "test-user",
        target: undefined,
        userId: "user-id-2",
        hmac: "hmac-val,extra",
      });
    });

    it("should decode correctly when x_field_1 has an invalid target (fallback to undefined)", () => {
      const formEntry = {
        x_field_1: "yuantu,test-user,InvalidTarget,user-id-3,hmac-val",
      };
      const result = validateAndDecodeXField("yuantu", formEntry);
      expect(result).to.deep.equal({
        userUrl: "test-user",
        target: undefined,
        userId: "user-id-3",
        hmac: "hmac-val",
      });
    });

    it("should return undefined when x_field_1 does not have enough parts", () => {
      const formEntry = {
        x_field_1: "yuantu,test-user,UserProfilePicture,user-id-1",
      };
      const result = validateAndDecodeXField("yuantu", formEntry);
      void expect(result).to.be.undefined;
    });

    it("should return undefined when x_field_1 is undefined", () => {
      const formEntry = {};
      const result = validateAndDecodeXField("yuantu", formEntry);
      void expect(result).to.be.undefined;
    });

    it("should return undefined when x_field_1 is empty", () => {
      const formEntry = { x_field_1: "" };
      const result = validateAndDecodeXField("yuantu", formEntry);
      void expect(result).to.be.undefined;
    });

    it("should throw error when tenant does not match", () => {
      const formEntry = {
        x_field_1:
          "wrongtenant,test-user,UserProfilePicture,user-id-1,hmac-val",
      };
      expect(() => validateAndDecodeXField("yuantu", formEntry)).to.throw(
        "Invalid tenant name in x_field_1: wrongtenant",
      );
    });
  });
});
