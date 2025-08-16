import { trpcNext } from "trpc";
import { Flex, Link } from "@chakra-ui/react";
import { maxTextWidth } from "theme/metrics";
import invariant from "shared/invariant";
import { paragraphSpacing } from "theme/metrics";
import { useMemo } from "react";
import NextLink from "next/link";
import { interviewExamExpiryDays, isExamExpired } from "shared/exams";
import { isProd } from "shared/isProd";

export function useExamsRequired() {
  const { data: state } = trpcNext.users.getUserState.useQuery();

  const commsExamRequired = useMemo(() => {
    if (!isProd()) return false;
    if (state === undefined) return undefined;
    return isExamExpired(state.commsExam);
  }, [state]);

  const interviewExamRequired = useMemo(() => {
    if (!isProd()) return false;
    if (state === undefined) return undefined;
    return isExamExpired(state.menteeInterviewerExam, interviewExamExpiryDays);
  }, [state]);

  return {
    commsExamRequired,
    interviewExamRequired,
  };
}

export function ExamsRequired({
  interviewExamRequired,
  commsExamRequired,
}: {
  interviewExamRequired: boolean;
  commsExamRequired: boolean;
}) {
  invariant(commsExamRequired || interviewExamRequired, "需要完成评测");

  return (
    <Flex direction="column" gap={paragraphSpacing} maxW={maxTextWidth}>
      <p>
        请首先完成
        {commsExamRequired && (
          <Link as={NextLink} href="/study/comms">
            《学生通信原则》自学与评测
          </Link>
        )}
        {commsExamRequired && interviewExamRequired && " 以及 "}
        {interviewExamRequired && (
          <Link as={NextLink} href="/study/interview">
            面试官自学与评测
          </Link>
        )}
        ，即可看到面试信息。
      </p>

      <p>我们邀请面试官每年重新评测一次，感谢你的理解与支持。</p>

      <p>
        导师面试与学生面试的原则一致，因此导师和学生面试官使用同一套测试题目。
      </p>
    </Flex>
  );
}
