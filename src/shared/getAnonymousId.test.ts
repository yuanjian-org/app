import { expect } from "chai";
import { getAnonymousId } from "./getAnonymousId";

describe("generateAnonymousId", () => {
  it("should generate a 6-character ID with acceptance year prefix and hyphen", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";
    const acceptanceYear = "2024";

    const id = getAnonymousId(userId, acceptanceYear);

    expect(id).to.be.a("string");
    expect(id.length).to.equal(6);
    expect(id.startsWith("24-")).to.equal(true);
  });

  it("should generate consistent IDs for the same inputs", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";
    const acceptanceYear = "2024";

    const id1 = getAnonymousId(userId, acceptanceYear);
    const id2 = getAnonymousId(userId, acceptanceYear);

    expect(id1).to.equal(id2);
  });

  it("should generate different IDs for different users with same year", () => {
    const userId1 = "12345678-1234-1234-1234-123456789abc";
    const userId2 = "87654321-4321-4321-4321-cba987654321";
    const acceptanceYear = "2024";

    const id1 = getAnonymousId(userId1, acceptanceYear);
    const id2 = getAnonymousId(userId2, acceptanceYear);

    expect(id1).to.not.equal(id2);
    expect(id1.substring(0, 3)).to.equal(id2.substring(0, 3));
    // Same year prefix with hyphen
  });

  it("should handle null acceptance year with default 00", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";

    const id = getAnonymousId(userId, null);

    expect(id.startsWith("00-")).to.equal(true);
    expect(id.length).to.equal(6);
  });

  it("should handle different year formats correctly", () => {
    const userId = "12345678-1234-1234-1234-123456789abc";

    const id2023 = getAnonymousId(userId, "2023");
    const id2024 = getAnonymousId(userId, "2024");

    expect(id2023.startsWith("23-")).to.equal(true);
    expect(id2024.startsWith("24-")).to.equal(true);
    // Last 3 digits should be the same (same userId)
    expect(id2023.substring(3)).to.equal(id2024.substring(3));
  });

  it("should always generate 3-digit hash with leading zeros if needed", () => {
    // Test multiple user IDs to ensure padding works
    for (let i = 0; i < 10; i++) {
      const userId = `test-user-${i}`;
      const id = getAnonymousId(userId, "2024");
      expect(id.length).to.equal(6);
      expect(id).to.match(/^\d{2}-\d{3}$/); // Format: YY-NNN
    }
  });
});
