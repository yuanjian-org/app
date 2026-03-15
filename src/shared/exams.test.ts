import { expect } from "chai";
import sinon from "sinon";
import { calculateExamsRequired, interviewExamExpiryDays } from "./exams";
import moment from "moment";

describe("calculateExamsRequired", () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    // Lock time to a specific date for consistent testing
    clock = sinon.useFakeTimers(new Date("2024-05-01T00:00:00Z").getTime());
  });

  afterEach(() => {
    clock.restore();
  });

  it("should return undefined for all if state or isDemo is not loaded", () => {
    expect(calculateExamsRequired(undefined, false, true)).to.deep.equal({
      commsExamRequired: undefined,
      interviewExamRequired: undefined,
      handbookExamRequired: undefined,
    });

    expect(calculateExamsRequired({}, undefined, true)).to.deep.equal({
      commsExamRequired: undefined,
      interviewExamRequired: undefined,
      handbookExamRequired: undefined,
    });

    expect(calculateExamsRequired(null, false, true)).to.deep.equal({
      commsExamRequired: undefined,
      interviewExamRequired: undefined,
      handbookExamRequired: undefined,
    });
  });

  it("should return false for all if not in production environment", () => {
    expect(calculateExamsRequired({}, false, false)).to.deep.equal({
      commsExamRequired: false,
      interviewExamRequired: false,
      handbookExamRequired: false,
    });
  });

  it("should return false for all if in demo mode", () => {
    expect(calculateExamsRequired({}, true, true)).to.deep.equal({
      commsExamRequired: false,
      interviewExamRequired: false,
      handbookExamRequired: false,
    });
  });

  it("should return true for exams that are missing (expired)", () => {
    const state = {};
    expect(calculateExamsRequired(state, false, true)).to.deep.equal({
      commsExamRequired: true,
      interviewExamRequired: true,
      handbookExamRequired: true,
    });
  });

  it("should return true for exams that are older than expiry days", () => {
    const commsDate = moment().subtract(366, "days").toDate().toISOString();
    const interviewDate = moment()
      .subtract(interviewExamExpiryDays + 1, "days")
      .toDate()
      .toISOString();
    const handbookDate = moment().subtract(366, "days").toDate().toISOString();

    const state = {
      commsExam: commsDate,
      menteeInterviewerExam: interviewDate,
      handbookExam: handbookDate,
    };

    expect(calculateExamsRequired(state, false, true)).to.deep.equal({
      commsExamRequired: true,
      interviewExamRequired: true,
      handbookExamRequired: true,
    });
  });

  it("should return false for exams that are not expired", () => {
    const commsDate = moment().subtract(364, "days").toDate().toISOString();
    const interviewDate = moment()
      .subtract(interviewExamExpiryDays - 1, "days")
      .toDate()
      .toISOString();
    const handbookDate = moment().subtract(364, "days").toDate().toISOString();

    const state = {
      commsExam: commsDate,
      menteeInterviewerExam: interviewDate,
      handbookExam: handbookDate,
    };

    expect(calculateExamsRequired(state, false, true)).to.deep.equal({
      commsExamRequired: false,
      interviewExamRequired: false,
      handbookExamRequired: false,
    });
  });

  it("should handle mixed expired and unexpired exams", () => {
    const expiredDate = moment().subtract(400, "days").toDate().toISOString();
    const unexpiredDate = moment().subtract(10, "days").toDate().toISOString();

    const state = {
      commsExam: unexpiredDate,
      menteeInterviewerExam: expiredDate,
      handbookExam: unexpiredDate,
    };

    expect(calculateExamsRequired(state, false, true)).to.deep.equal({
      commsExamRequired: false,
      interviewExamRequired: true,
      handbookExamRequired: false,
    });
  });
});
