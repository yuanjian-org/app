import { expect } from "chai";
import { calculateExamsRequired, defaultExamExpiryDays, interviewExamExpiryDays } from "./exams";

describe("calculateExamsRequired", () => {
  it("should return undefined for all if state or isDemo is undefined", () => {
    const res1 = calculateExamsRequired({
      state: undefined,
      isDemo: false,
      isProdEnv: true,
    });
    expect(res1.commsExamRequired).to.be.undefined;
    expect(res1.interviewExamRequired).to.be.undefined;
    expect(res1.handbookExamRequired).to.be.undefined;

    const res2 = calculateExamsRequired({
      state: {},
      isDemo: undefined,
      isProdEnv: true,
    });
    expect(res2.commsExamRequired).to.be.undefined;
    expect(res2.interviewExamRequired).to.be.undefined;
    expect(res2.handbookExamRequired).to.be.undefined;
  });

  it("should return false for all if isProdEnv is false or isDemo is true", () => {
    const res1 = calculateExamsRequired({
      state: {},
      isDemo: false,
      isProdEnv: false,
    });
    expect(res1.commsExamRequired).to.be.false;
    expect(res1.interviewExamRequired).to.be.false;
    expect(res1.handbookExamRequired).to.be.false;

    const res2 = calculateExamsRequired({
      state: {},
      isDemo: true,
      isProdEnv: true,
    });
    expect(res2.commsExamRequired).to.be.false;
    expect(res2.interviewExamRequired).to.be.false;
    expect(res2.handbookExamRequired).to.be.false;
  });

  it("should require exams if state is empty (exams not passed) in prod and not demo", () => {
    const res = calculateExamsRequired({
      state: {},
      isDemo: false,
      isProdEnv: true,
    });
    expect(res.commsExamRequired).to.be.true;
    expect(res.interviewExamRequired).to.be.true;
    expect(res.handbookExamRequired).to.be.true;
  });

  it("should not require exams if passed recently in prod and not demo", () => {
    const res = calculateExamsRequired({
      state: {
        commsExam: new Date(Date.now() - 100 * 86400000).toISOString(),
        menteeInterviewerExam: new Date(Date.now() - 100 * 86400000).toISOString(),
        handbookExam: new Date(Date.now() - 100 * 86400000).toISOString(),
      },
      isDemo: false,
      isProdEnv: true,
    });
    expect(res.commsExamRequired).to.be.false;
    expect(res.interviewExamRequired).to.be.false;
    expect(res.handbookExamRequired).to.be.false;
  });

  it("should require comms and handbook exams after default expiry days", () => {
    const res = calculateExamsRequired({
      state: {
        commsExam: new Date(Date.now() - (defaultExamExpiryDays + 1) * 86400000).toISOString(),
        menteeInterviewerExam: new Date(Date.now() - 100 * 86400000).toISOString(),
        handbookExam: new Date(Date.now() - (defaultExamExpiryDays + 1) * 86400000).toISOString(),
      },
      isDemo: false,
      isProdEnv: true,
    });
    expect(res.commsExamRequired).to.be.true;
    expect(res.interviewExamRequired).to.be.false;
    expect(res.handbookExamRequired).to.be.true;
  });

  it("should require interview exam after interview expiry days", () => {
    const res = calculateExamsRequired({
      state: {
        commsExam: new Date(Date.now() - 100 * 86400000).toISOString(),
        menteeInterviewerExam: new Date(Date.now() - (interviewExamExpiryDays + 1) * 86400000).toISOString(),
        handbookExam: new Date(Date.now() - 100 * 86400000).toISOString(),
      },
      isDemo: false,
      isProdEnv: true,
    });
    expect(res.commsExamRequired).to.be.false;
    expect(res.interviewExamRequired).to.be.true;
    expect(res.handbookExamRequired).to.be.false;
  });
});
