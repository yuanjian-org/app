import { expect } from "chai";
import {
  hashUserIdForClient,
  encryptPayload,
  decryptPayload,
} from "./utils";

describe("OAuth2 Utils", () => {
  describe("hashUserIdForClient", () => {
    it("should generate a consistent hash for the same client and user", () => {
      const hash1 = hashUserIdForClient("client1", "user1");
      const hash2 = hashUserIdForClient("client1", "user1");
      expect(hash1).to.equal(hash2);
    });

    it("should generate different hashes for different clients with the same user", () => {
      const hash1 = hashUserIdForClient("client1", "user1");
      const hash2 = hashUserIdForClient("client2", "user1");
      expect(hash1).to.not.equal(hash2);
    });

    it("should generate different hashes for the same client with different users", () => {
      const hash1 = hashUserIdForClient("client1", "user1");
      const hash2 = hashUserIdForClient("client1", "user2");
      expect(hash1).to.not.equal(hash2);
    });
  });

  describe("encryptPayload and decryptPayload", () => {
    let originalEnvSecret: string | undefined;

    before(() => {
      originalEnvSecret = process.env.NEXTAUTH_SECRET;
      // Set a fake secret for testing
      process.env.NEXTAUTH_SECRET = "test-secret-1234567890";
    });

    after(() => {
      if (originalEnvSecret) {
        process.env.NEXTAUTH_SECRET = originalEnvSecret;
      } else {
        delete process.env.NEXTAUTH_SECRET;
      }
    });

    it("should correctly encrypt and decrypt a payload", async () => {
      const payload = { userId: "user-123", clientId: "client-abc" };

      const encrypted = await encryptPayload(payload);
      expect(encrypted).to.be.a("string");
      expect(encrypted).to.not.include("user-123"); // Shouldn't be plaintext

      const decrypted = await decryptPayload(encrypted);
      expect(decrypted.userId).to.equal(payload.userId);
      expect(decrypted.clientId).to.equal(payload.clientId);
    });

    it("should fail to decrypt if the payload was modified", async () => {
      const payload = { test: true };
      const encrypted = await encryptPayload(payload);

      // Tamper with the token (modifying a character in the middle)
      const tampered = encrypted.substring(0, 10) + "A" + encrypted.substring(11);

      let error = null;
      try {
        await decryptPayload(tampered);
      } catch (e) {
        error = e;
      }
      expect(error).to.not.be.null;
    });
  });
});
