import { expect } from "chai";
import sinon from "sinon";
import {
  isExamExpired,
  isExamAboutToExpire,
  defaultExamExpiryDays,
  interviewExamExpiryDays,
} from "./exams";

describe("exams.tsx", () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    // Set a fixed date for deterministic testing
    clock = sinon.useFakeTimers(new Date("2024-01-01T00:00:00Z").getTime());
  });

  afterEach(() => {
    clock.restore();
  });

  const subtractDays = (days: number): string => {
    // using absolute math to avoid local DST issues
    return new Date(Date.now() - days * 86400000).toISOString();
  };

  describe("isExamExpired", () => {
    it("should return true when lastPassed is undefined", () => {
      void expect(isExamExpired(undefined, defaultExamExpiryDays)).to.be.true;
    });

    it("should return false when exam was passed today", () => {
      const today = new Date().toISOString();
      void expect(isExamExpired(today, defaultExamExpiryDays)).to.be.false;
    });

    it("should return false when exam was passed exactly defaultExamExpiryDays ago", () => {
      const passedDate = subtractDays(defaultExamExpiryDays);
      void expect(isExamExpired(passedDate, defaultExamExpiryDays)).to.be.false;
    });

    it("should return true when exam was passed more than defaultExamExpiryDays ago", () => {
      const passedDate = subtractDays(defaultExamExpiryDays + 1);
      void expect(isExamExpired(passedDate, defaultExamExpiryDays)).to.be.true;
    });

    it("should return false when exam was passed exactly interviewExamExpiryDays ago (custom expiry)", () => {
      const passedDate = subtractDays(interviewExamExpiryDays);
      void expect(isExamExpired(passedDate, interviewExamExpiryDays)).to.be
        .false;
    });

    it("should return true when exam was passed more than interviewExamExpiryDays ago (custom expiry)", () => {
      const passedDate = subtractDays(interviewExamExpiryDays + 1);
      void expect(isExamExpired(passedDate, interviewExamExpiryDays)).to.be
        .true;
    });
  });

  describe("isExamAboutToExpire", () => {
    it("should return true when lastPassed is undefined", () => {
      void expect(isExamAboutToExpire(undefined, defaultExamExpiryDays)).to.be
        .true;
    });

    it("should return false when exam was passed today", () => {
      const today = new Date().toISOString();
      void expect(isExamAboutToExpire(today, defaultExamExpiryDays)).to.be
        .false;
    });

    it("should return false when exam was passed less than (expiryDays - 30) ago", () => {
      const passedDate = subtractDays(defaultExamExpiryDays - 31);
      void expect(isExamAboutToExpire(passedDate, defaultExamExpiryDays)).to.be
        .false;
    });

    it("should return false when exam was passed exactly (expiryDays - 30) ago", () => {
      const passedDate = subtractDays(defaultExamExpiryDays - 30);
      void expect(isExamAboutToExpire(passedDate, defaultExamExpiryDays)).to.be
        .false;
    });

    it("should return true when exam was passed more than (expiryDays - 30) ago", () => {
      const passedDate = subtractDays(defaultExamExpiryDays - 29);
      void expect(isExamAboutToExpire(passedDate, defaultExamExpiryDays)).to.be
        .true;
    });

    it("should return true when exam is already expired", () => {
      const passedDate = subtractDays(defaultExamExpiryDays + 1);
      void expect(isExamAboutToExpire(passedDate, defaultExamExpiryDays)).to.be
        .true;
    });

    it("should return false when exam was passed exactly (customExpiryDays - 30) ago (custom expiry)", () => {
      const customExpiry = 100;
      const passedDate = subtractDays(customExpiry - 30);
      void expect(isExamAboutToExpire(passedDate, customExpiry)).to.be.false;
    });

    it("should return true when exam was passed more than (customExpiryDays - 30) ago (custom expiry)", () => {
      const customExpiry = 100;
      const passedDate = subtractDays(customExpiry - 29);
      void expect(isExamAboutToExpire(passedDate, customExpiry)).to.be.true;
    });
  });
});
