import { trpcNext } from "trpc";
import { Flex, Link } from "@chakra-ui/react";
import { maxTextWidth } from "theme/metrics";
import invariant from "shared/invariant";
import { paragraphSpacing } from "theme/metrics";
import { useMemo } from "react";
import NextLink from "next/link";
import { calculateExamsRequired } from "shared/exams";
import { isProd } from "shared/isProd";

export function useExamsRequired() {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const { data: isDemo } = trpcNext.globalConfigs.isDemo.useQuery();

  return useMemo(
    () => calculateExamsRequired(state, isDemo, isProd()),
    [state, isDemo]
  );
}

export function ExamsRequired({
  interviewExamRequired,
  commsExamRequired,
  handbookExamRequired,
  actionText = "即可看到面试信息",
  roleText = "面试官",
}: {
  interviewExamRequired?: boolean;
  commsExamRequired?: boolean;
  handbookExamRequired?: boolean;
  actionText?: string;
  roleText?: string;
}) {
  invariant(
    commsExamRequired || interviewExamRequired || handbookExamRequired,
    "需要完成评测",
  );

  const links = [];
  if (commsExamRequired) {
    links.push(
      <Link as={NextLink} href="/study/comms" key="comms">
        《学生通信原则》自学与评测
      </Link>,
    );
  }
  if (interviewExamRequired) {
    links.push(
      <Link as={NextLink} href="/study/interview" key="interview">
        面试官自学与评测
      </Link>,
    );
  }
  if (handbookExamRequired) {
    links.push(
      <Link as={NextLink} href="/study/handbook" key="handbook">
        《社会导师手册》自学与评测
      </Link>,
    );
  }

  return (
    <Flex direction="column" gap={paragraphSpacing} maxW={maxTextWidth}>
      <p>
        请首先完成
        {links.map((link, index) => (
          <span key={link.key}>
            {index > 0 && " 以及 "}
            {link}
          </span>
        ))}
        ，{actionText}。
      </p>

      <p>我们邀请{roleText}每年重新评测一次，感谢你的理解与支持。</p>

      {interviewExamRequired && (
        <p>
          导师面试与学生面试的原则一致，因此导师和学生面试官使用同一套测试题目。
        </p>
      )}
    </Flex>
  );
}
