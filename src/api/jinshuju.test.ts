import { expect } from "chai";
import crypto from "crypto";
import { encodeXField, validateAndDecodeXField } from "./jinshuju";

describe("jinshuju", () => {
  let originalSecret: string | undefined;

  beforeEach(() => {
    originalSecret = process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.NEXTAUTH_SECRET = originalSecret;
  });

  describe("encodeXField & validateAndDecodeXField", () => {
    it("should encode correctly when user has a url and then decode successfully", () => {
      const user = { id: "1", url: "test-user", name: "Test" };
      const xField = encodeXField("yuantu", user.url, user.id);

      const parts = xField.split(",");
      expect(parts.length).to.equal(5);
      expect(parts[0]).to.equal("yuantu");
      expect(parts[1]).to.equal("test-user");
      expect(parts[2]).to.equal("1");

      const decoded = validateAndDecodeXField("yuantu", {
        x_field_1: xField,
      });
      expect(decoded[0]).to.equal("1");
      expect(decoded.length).to.equal(1);
    });

    it("should encode correctly when user url is empty", () => {
      const xField = encodeXField("yuantu", "", "3");
      const parts = xField.split(",");
      expect(parts.length).to.equal(5);
      expect(parts[0]).to.equal("yuantu");
      expect(parts[1]).to.equal("");
      expect(parts[2]).to.equal("3");

      const decoded = validateAndDecodeXField("yuantu", {
        x_field_1: xField,
      });
      expect(decoded[0]).to.equal("3");
      expect(decoded.length).to.equal(1);
    });

    it("should encode and decode correctly when there are extra fields", () => {
      const xField = encodeXField(
        "yuantu",
        "test-user",
        "1",
        "extra1",
        "extra2",
      );
      const parts = xField.split(",");
      expect(parts.length).to.equal(7);
      expect(parts[0]).to.equal("yuantu");
      expect(parts[1]).to.equal("test-user");
      expect(parts[2]).to.equal("1");
      expect(parts[4]).to.equal("extra1");
      expect(parts[5]).to.equal("extra2");

      const decoded = validateAndDecodeXField("yuantu", {
        x_field_1: xField,
      });
      expect(decoded[0]).to.equal("1");
      expect(decoded[1]).to.equal("extra1");
      expect(decoded[2]).to.equal("extra2");
      expect(decoded.length).to.equal(3);
    });

    it("should fail on malformed x_field_1", () => {
      const formEntry = { x_field_1: "nocomma" };
      expect(() => validateAndDecodeXField("yuantu", formEntry)).to.throw(
        "Malformed x_field_1",
      );
    });

    it("should fail when x_field_1 is undefined", () => {
      const formEntry = {};
      expect(() => validateAndDecodeXField("yuantu", formEntry)).to.throw(
        "Empty or malformed x_field_1",
      );
    });

    it("should throw error when tenant does not match", () => {
      const xField = encodeXField("wrongtenant" as any, "url", "1");
      const formEntry = { x_field_1: xField };
      expect(() => validateAndDecodeXField("yuantu", formEntry)).to.throw(
        "Invalid tenant name in x_field_1: wrongtenant",
      );
    });

    it("should throw error when HMAC is tampered", () => {
      const xField = encodeXField("yuantu", "url", "1");
      const parts = xField.split(",");
      parts[4] = "tampered";
      const formEntry = { x_field_1: parts.join(",") };
      expect(() => validateAndDecodeXField("yuantu", formEntry)).to.throw(
        "Invalid HMAC in x_field_1",
      );
    });

    it("should throw error when timestamp is in the future", () => {
      const xField = encodeXField("yuantu", "url", "1");
      const parts = xField.split(",");
      parts[3] = (Math.floor(Date.now() / 1000) + 3600).toString(); // 1 hour in future
      const data = `${parts[0]},${parts[1]},${parts[2]},${parts[3]}`;
      const hmac = crypto
        .createHmac("sha256", "test-secret")
        .update(data)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      parts[4] = hmac;

      const formEntry = { x_field_1: parts.join(",") };
      expect(() => validateAndDecodeXField("yuantu", formEntry)).to.throw(
        "Timestamp in x_field_1 is in the future",
      );
    });

    it("should throw error when timestamp is older than 30 minutes", () => {
      const xField = encodeXField("yuantu", "url", "1");
      const parts = xField.split(",");
      parts[3] = (Math.floor(Date.now() / 1000) - 31 * 60).toString(); // 31 minutes ago

      const data = `${parts[0]},${parts[1]},${parts[2]},${parts[3]}`;
      const hmac = crypto
        .createHmac("sha256", "test-secret")
        .update(data)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      parts[4] = hmac;

      const formEntry = { x_field_1: parts.join(",") };
      expect(() => validateAndDecodeXField("yuantu", formEntry)).to.throw(
        "Timestamp in x_field_1 expired",
      );
    });
  });
});
