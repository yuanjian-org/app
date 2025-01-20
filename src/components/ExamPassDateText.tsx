import { DateColumn } from "shared/DateColumn";
import { prettifyDate } from "shared/strings";
import { Text } from "@chakra-ui/react";
import { warningTextColor } from "theme/colors";
import { okTextColor } from "theme/colors";
import { actionRequiredTextColor } from "theme/colors";
import { isExamExpired, isExamAboutToExpire } from "shared/exams";

export default function ExamPassDateText({ lastPassed, expiryDays }: {
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
