import { DateColumn } from "./DateColumn";
import moment from "moment";
import { Features } from "./Features";

export const defaultExamExpiryDays = 365;

// 300 days instead of 365 days because the start of the next interview
// cycle varies from year to year.
export const interviewExamExpiryDays = 300;

/**
 * @param lastPassed Assume the exam is expired if undefined
 */
export function isExamExpired(
  lastPassed: DateColumn | undefined,
  expiryDays: number = defaultExamExpiryDays,
) {
  if (!lastPassed) return true;
  return moment().diff(moment(lastPassed), "days") > expiryDays;
}

/**
 * @param lastPassed Assume the exam is expired if undefined
 * @returns Whether the exam is about to expire or already expired
 */
export function isExamAboutToExpire(
  lastPassed: DateColumn | undefined,
  expiryDays: number = defaultExamExpiryDays,
) {
  return isExamExpired(lastPassed, expiryDays - 30);
}

export function calculateExamsRequired({
  state,
  features,
}: {
  state?: {
    commsExam?: DateColumn;
    menteeInterviewerExam?: DateColumn;
    handbookExam?: DateColumn;
  };
  features: Features;
}) {
  if (state === undefined) {
    return {
      commsExamRequired: undefined,
      interviewExamRequired: undefined,
      handbookExamRequired: undefined,
    };
  }
  if (!features.exams) {
    return {
      commsExamRequired: false,
      interviewExamRequired: false,
      handbookExamRequired: false,
    };
  }

  return {
    commsExamRequired: isExamExpired(state.commsExam),
    interviewExamRequired: isExamExpired(
      state.menteeInterviewerExam,
      interviewExamExpiryDays,
    ),
    handbookExamRequired: isExamExpired(state.handbookExam),
  };
}
