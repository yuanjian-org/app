import { DateColumn } from "shared/DateColumn";
import moment from "moment";
import { prettifyDate } from "shared/strings";
import { Text } from "@chakra-ui/react";
import { warningTextColor } from "theme/colors";
import { okTextColor } from "theme/colors";
import { actionRequiredTextColor } from "theme/colors";

export const defaultExamExpiryDays = 365;

// 300 days instead of 365 days because the start of the next interview
// cycle varies from year to year.
export const interviewExamExpiryDays = 300;

export function examsEnabled() {
  return process.env.NODE_ENV === 'production';
}

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
 */
export function isExamAboutToExpire(
  lastPassed: DateColumn | undefined,
  expiryDays: number = defaultExamExpiryDays,
) {
  return isExamExpired(lastPassed, expiryDays - 30);
}

export function ExamPassDateText({ lastPassed, expiryDays }: {
  lastPassed: DateColumn | undefined,
  expiryDays?: number,
}) {
  return <Text color={isExamExpired(lastPassed, expiryDays) ?
    actionRequiredTextColor :
    isExamAboutToExpire(lastPassed, expiryDays) ? warningTextColor : okTextColor}
  >
    {lastPassed ? prettifyDate(lastPassed) : "尚未通过"}
  </Text>;
}
