import { expect } from "chai";
import {
  encodeXField,
  decodeXField,
  encodeUploadTokenUrlSafe,
  decodeUploadTokenUrlSafe,
} from "./jinshuju";
import { MinUser } from "./User";

describe("jinshuju", () => {
  describe("encodeXField", () => {
    it("should encode correctly when user has a url", () => {
      const user: MinUser = { id: "1", url: "test-user", name: "Test" };
      const result = encodeXField(user, "safe-val");
      expect(result).to.equal("test-user,safe-val");
    });

    it("should encode correctly when user url is null", () => {
      const user: MinUser = { id: "2", url: null, name: "Test2" };
      const result = encodeXField(user, "safe-val2");
      expect(result).to.equal(",safe-val2");
    });

    it("should encode correctly when user url is empty", () => {
      const user: MinUser = { id: "3", url: "", name: "Test3" };
      const result = encodeXField(user, "safe-val3");
      expect(result).to.equal(",safe-val3");
    });
  });

  describe("decodeXField", () => {
    it("should decode correctly when x_field_1 has a comma", () => {
      const formEntry = { x_field_1: "test-user,safe-val" };
      const result = decodeXField(formEntry);
      expect(result).to.equal("safe-val");
    });

    it("should decode correctly when x_field_1 has multiple commas", () => {
      const formEntry = { x_field_1: "test-user,safe-val,extra" };
      const result = decodeXField(formEntry);
      expect(result).to.equal("safe-val");
    });

    it("should return undefined when x_field_1 has no comma", () => {
      const formEntry = { x_field_1: "nocomma" };
      const result = decodeXField(formEntry);
      void expect(result).to.be.undefined;
    });

    it("should return undefined when x_field_1 is undefined", () => {
      const formEntry = {};
      const result = decodeXField(formEntry);
      void expect(result).to.be.undefined;
    });

    it("should return undefined when x_field_1 is empty", () => {
      const formEntry = { x_field_1: "" };
      const result = decodeXField(formEntry);
      void expect(result).to.be.undefined;
    });
  });

  describe("Upload Token Encoding", () => {
    it("should encode and decode token symmetrically", () => {
      const target = "UserProfilePicture";
      const id = "user-123";
      const opaque = "secret-token-456";

      const encoded = encodeUploadTokenUrlSafe(target, id, opaque);
      const decoded = decodeUploadTokenUrlSafe(encoded);

      expect(decoded.target).to.equal(target);
      expect(decoded.id).to.equal(id);
      expect(decoded.opaque).to.equal(opaque);
    });

    it("should be URL safe (no +, /, =)", () => {
      const target = "UserProfileVideo";
      // Using characters that might cause + / = in base64
      const id = "id-with-special-chars-???!!!~~~";
      const opaque = "opaque-with-special-chars-???!!!~~~";

      const encoded = encodeUploadTokenUrlSafe(target, id, opaque);

      expect(encoded).to.not.include("+");
      expect(encoded).to.not.include("/");
      expect(encoded).to.not.include("=");
    });
  });
});
