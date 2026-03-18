import { expect } from "chai";
import {
  isExamExpired,
  isExamAboutToExpire,
  defaultExamExpiryDays,
} from "./exams";

describe("Exams Requirements", () => {
  describe("isExamExpired", () => {
    it("should return true if lastPassed is undefined", () => {
      const result = isExamExpired(undefined);
      void expect(result).to.be.true;
    });

    it("should return true if lastPassed is strictly older than expiryDays", () => {
      // Create a date that is (defaultExamExpiryDays + 1) days ago.
      // Use absolute epoch math to avoid timezone/DST flakiness.
      const daysAgo = defaultExamExpiryDays + 1;
      const lastPassed = new Date(Date.now() - daysAgo * 86400000);
      const result = isExamExpired(lastPassed);
      void expect(result).to.be.true;
    });

    it("should return false if lastPassed is newer than expiryDays", () => {
      const daysAgo = defaultExamExpiryDays - 1;
      const lastPassed = new Date(Date.now() - daysAgo * 86400000);
      const result = isExamExpired(lastPassed);
      void expect(result).to.be.false;
    });

    it("should work correctly with custom expiryDays", () => {
      const customExpiryDays = 300;

      const expiredDate = new Date(Date.now() - (customExpiryDays + 1) * 86400000);
      void expect(isExamExpired(expiredDate, customExpiryDays)).to.be.true;

      const validDate = new Date(Date.now() - (customExpiryDays - 1) * 86400000);
      void expect(isExamExpired(validDate, customExpiryDays)).to.be.false;
    });
  });

  describe("isExamAboutToExpire", () => {
    it("should return true if lastPassed is undefined", () => {
      const result = isExamAboutToExpire(undefined);
      void expect(result).to.be.true;
    });

    it("should return true if lastPassed is within the 30-day about to expire window", () => {
      // If defaultExpiryDays is 365, the window is 335 to 365.
      const daysAgo = defaultExamExpiryDays - 15; // e.g. 350 days ago
      const lastPassed = new Date(Date.now() - daysAgo * 86400000);
      const result = isExamAboutToExpire(lastPassed);
      void expect(result).to.be.true;
    });

    it("should return false if lastPassed is not about to expire (safely valid)", () => {
      const daysAgo = defaultExamExpiryDays - 40; // e.g. 325 days ago
      const lastPassed = new Date(Date.now() - daysAgo * 86400000);
      const result = isExamAboutToExpire(lastPassed);
      void expect(result).to.be.false;
    });

    it("should return true if the exam has already expired", () => {
      const daysAgo = defaultExamExpiryDays + 10; // e.g. 375 days ago
      const lastPassed = new Date(Date.now() - daysAgo * 86400000);
      const result = isExamAboutToExpire(lastPassed);
      void expect(result).to.be.true;
    });
  });
});
