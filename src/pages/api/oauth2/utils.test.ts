import { expect } from "chai";
import { hashUserIdForClient, encryptPayload, decryptPayload } from "./utils";

describe("OAuth2 utils", () => {
  const mockSecret = "mock-secret-for-testing-mock-secret-for-testing";

  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = mockSecret;
  });

  afterEach(() => {
    delete process.env.NEXTAUTH_SECRET;
  });

  describe("hashUserIdForClient", () => {
    it("should hash client ID and user ID consistently", () => {
      const hash1 = hashUserIdForClient("client1", "user1");
      const hash2 = hashUserIdForClient("client1", "user1");
      expect(hash1).to.equal(hash2);
    });

    it("should produce different hashes for different clients", () => {
      const hash1 = hashUserIdForClient("client1", "user1");
      const hash2 = hashUserIdForClient("client2", "user1");
      expect(hash1).to.not.equal(hash2);
    });

    it("should throw error if NEXTAUTH_SECRET is not set", () => {
      delete process.env.NEXTAUTH_SECRET;

      try {
        hashUserIdForClient("client1", "user1");
        expect.fail("Should throw error");
      } catch (err: any) {
        expect(err.message).to.equal("NEXTAUTH_SECRET is not set");
      }
    });
  });

  describe("encryptPayload and decryptPayload", () => {
    it("should encrypt and decrypt payload successfully", async () => {
      const payload = { userId: "user-123", type: "code" };
      const encrypted = await encryptPayload(payload);
      expect(typeof encrypted).to.equal("string");

      const decrypted = await decryptPayload(encrypted);
      expect(decrypted.userId).to.equal(payload.userId);
      expect(decrypted.type).to.equal(payload.type);
    });

    it("should throw error if NEXTAUTH_SECRET is not set", async () => {
      delete process.env.NEXTAUTH_SECRET;

      try {
        await encryptPayload({ test: "data" });
        expect.fail("Should throw error");
      } catch (err: any) {
        expect(err.message).to.equal("NEXTAUTH_SECRET is not set");
      }
    });
  });
});
