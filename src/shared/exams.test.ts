import { expect } from "chai";
import {
  isExamExpired,
  isExamAboutToExpire,
  defaultExamExpiryDays,
  calculateExamsRequired,
  interviewExamExpiryDays,
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
      const lastPassed = new Date(
        Date.now() - daysAgo * 86400000,
      ).toISOString();
      const result = isExamExpired(lastPassed);
      void expect(result).to.be.true;
    });

    it("should return false if lastPassed is newer than expiryDays", () => {
      const daysAgo = defaultExamExpiryDays - 1;
      const lastPassed = new Date(
        Date.now() - daysAgo * 86400000,
      ).toISOString();
      const result = isExamExpired(lastPassed);
      void expect(result).to.be.false;
    });

    it("should work correctly with custom expiryDays", () => {
      const customExpiryDays = 300;

      const expiredDate = new Date(
        Date.now() - (customExpiryDays + 1) * 86400000,
      ).toISOString();
      void expect(isExamExpired(expiredDate, customExpiryDays)).to.be.true;

      const validDate = new Date(
        Date.now() - (customExpiryDays - 1) * 86400000,
      ).toISOString();
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
      const lastPassed = new Date(
        Date.now() - daysAgo * 86400000,
      ).toISOString();
      const result = isExamAboutToExpire(lastPassed);
      void expect(result).to.be.true;
    });

    it("should return false if lastPassed is not about to expire (safely valid)", () => {
      const daysAgo = defaultExamExpiryDays - 40; // e.g. 325 days ago
      const lastPassed = new Date(
        Date.now() - daysAgo * 86400000,
      ).toISOString();
      const result = isExamAboutToExpire(lastPassed);
      void expect(result).to.be.false;
    });

    it("should return true if the exam has already expired", () => {
      const daysAgo = defaultExamExpiryDays + 10; // e.g. 375 days ago
      const lastPassed = new Date(
        Date.now() - daysAgo * 86400000,
      ).toISOString();
      const result = isExamAboutToExpire(lastPassed);
      void expect(result).to.be.true;
    });
  });
});

describe("calculateExamsRequired", () => {
  it("should return undefined for all if state or isDemo is undefined", () => {
    const res1 = calculateExamsRequired({
      state: undefined,
      isDemo: false,
      isProdEnv: true,
    });
    void expect(res1.commsExamRequired).to.be.undefined;
    void expect(res1.interviewExamRequired).to.be.undefined;
    void expect(res1.handbookExamRequired).to.be.undefined;

    const res2 = calculateExamsRequired({
      state: {},
      isDemo: undefined,
      isProdEnv: true,
    });
    void expect(res2.commsExamRequired).to.be.undefined;
    void expect(res2.interviewExamRequired).to.be.undefined;
    void expect(res2.handbookExamRequired).to.be.undefined;
  });

  it("should return false for all if isProdEnv is false or isDemo is true", () => {
    const res1 = calculateExamsRequired({
      state: {},
      isDemo: false,
      isProdEnv: false,
    });
    void expect(res1.commsExamRequired).to.be.false;
    void expect(res1.interviewExamRequired).to.be.false;
    void expect(res1.handbookExamRequired).to.be.false;

    const res2 = calculateExamsRequired({
      state: {},
      isDemo: true,
      isProdEnv: true,
    });
    void expect(res2.commsExamRequired).to.be.false;
    void expect(res2.interviewExamRequired).to.be.false;
    void expect(res2.handbookExamRequired).to.be.false;
  });

  it("should require exams if state is empty (exams not passed) in prod and not demo", () => {
    const res = calculateExamsRequired({
      state: {},
      isDemo: false,
      isProdEnv: true,
    });
    void expect(res.commsExamRequired).to.be.true;
    void expect(res.interviewExamRequired).to.be.true;
    void expect(res.handbookExamRequired).to.be.true;
  });

  it("should not require exams if passed recently in prod and not demo", () => {
    const res = calculateExamsRequired({
      state: {
        commsExam: new Date(Date.now() - 100 * 86400000).toISOString(),
        menteeInterviewerExam: new Date(
          Date.now() - 100 * 86400000,
        ).toISOString(),
        handbookExam: new Date(Date.now() - 100 * 86400000).toISOString(),
      },
      isDemo: false,
      isProdEnv: true,
    });
    void expect(res.commsExamRequired).to.be.false;
    void expect(res.interviewExamRequired).to.be.false;
    void expect(res.handbookExamRequired).to.be.false;
  });

  it("should require comms and handbook exams after default expiry days", () => {
    const res = calculateExamsRequired({
      state: {
        commsExam: new Date(
          Date.now() - (defaultExamExpiryDays + 1) * 86400000,
        ).toISOString(),
        menteeInterviewerExam: new Date(
          Date.now() - 100 * 86400000,
        ).toISOString(),
        handbookExam: new Date(
          Date.now() - (defaultExamExpiryDays + 1) * 86400000,
        ).toISOString(),
      },
      isDemo: false,
      isProdEnv: true,
    });
    void expect(res.commsExamRequired).to.be.true;
    void expect(res.interviewExamRequired).to.be.false;
    void expect(res.handbookExamRequired).to.be.true;
  });

  it("should require interview exam after interview expiry days", () => {
    const res = calculateExamsRequired({
      state: {
        commsExam: new Date(Date.now() - 100 * 86400000).toISOString(),
        menteeInterviewerExam: new Date(
          Date.now() - (interviewExamExpiryDays + 1) * 86400000,
        ).toISOString(),
        handbookExam: new Date(Date.now() - 100 * 86400000).toISOString(),
      },
      isDemo: false,
      isProdEnv: true,
    });
    void expect(res.commsExamRequired).to.be.false;
    void expect(res.interviewExamRequired).to.be.true;
    void expect(res.handbookExamRequired).to.be.false;
  });
});
