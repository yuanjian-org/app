import { useRouter } from "next/router";
import { parseQueryString } from "shared/strings/parseQueryString";
import { trpcNext } from "trpc";
import Loader from "components/Loader";
import {
  Flex,
  Grid,
  GridItem,
  Icon,
  Link,
  UnorderedList,
  ListItem,
} from "@chakra-ui/react";
import { breakpoint } from "theme/breakpoints";
import invariant from "shared/invariant";
import PageBreadcrumb from "components/PageBreadcrumb";
import { formatUserName } from "shared/strings/formatUserName";
import Applicant from "components/Applicant";
import { BsWechat } from "react-icons/bs";
import { MinUser } from "shared/User";
import { ExternalLinkIcon } from "@chakra-ui/icons";
import { sectionSpacing } from "theme/metrics";
import { InterviewFeedbackEditor } from "components/InterviewEditor";
import { widePage } from "AppPage";
import { useMyId } from "useMe";
import { InterviewType } from "shared/InterviewType";
import { useMemo } from "react";
import { ExamsRequired, useExamsRequired } from "components/ExamsRequired";
import T from "components/T";

export default widePage(() => {
  const interviewId = parseQueryString(useRouter(), "interviewId");
  const { data } = trpcNext.interviews.get.useQuery(
    { interviewId: interviewId ?? "" },
    { enabled: !!interviewId },
  );

  const { commsExamRequired, interviewExamRequired } = useExamsRequired();

  const myId = useMyId();
  const myFeedbackId = useMemo(() => {
    if (!data) return undefined;
    const feedbacks = data.interviewWithGroup.feedbacks.filter(
      (f) => f.interviewer.id === myId,
    );
    invariant(feedbacks.length == 1, "面试官只能有一个反馈");
    return feedbacks[0].id;
  }, [data, myId]);

  const i = data?.interviewWithGroup;

  return i === undefined ||
    interviewExamRequired === undefined ||
    commsExamRequired === undefined ? (
    <Loader />
  ) : interviewExamRequired || commsExamRequired ? (
    <ExamsRequired
      interviewExamRequired={interviewExamRequired}
      commsExamRequired={commsExamRequired}
    />
  ) : (
    <>
      <PageBreadcrumb
        current={formatUserName(i.interviewee.name)}
        parents={[
          {
            name: "我的面试",
            link: "/interviews/mine",
          },
        ]}
      />

      <Grid
        templateColumns={{ base: "100%", [breakpoint]: "1fr 1fr" }}
        gap={sectionSpacing}
      >
        <GridItem>
          <Flex direction="column" gap={sectionSpacing}>
            <Instructions
              type={i.type}
              interviewers={i.feedbacks.map((f) => f.interviewer)}
            />
            <InterviewFeedbackEditor
              type={i.type}
              interviewFeedbackId={myFeedbackId ?? ""}
            />
          </Flex>
        </GridItem>
        <GridItem>
          <Applicant userId={i.interviewee.id} type={i.type} showTitle />
        </GridItem>
      </Grid>
    </>
  );
});

function Instructions({
  type,
  interviewers,
}: {
  type: InterviewType;
  interviewers: MinUser[];
}) {
  const myId = useMyId();

  let first: boolean | null = null;
  let other: MinUser | null = null;
  invariant(
    interviewers.filter((i) => i.id === myId).length == 1,
    "面试官只能有一个",
  );
  if (interviewers.length == 2) {
    other = interviewers[0].id === myId ? interviewers[1] : interviewers[0];
    first = other.id > myId;
  }

  const isMentee = type == "MenteeInterview";
  const firstHalf = isMentee ? "1 到 4" : "1 到 5";
  const secondHalf = isMentee ? "5 到 8" : "6 到 10";
  const otherName = formatUserName(other?.name ?? null, "friendly");

  return (
    <Flex direction="column" gap={sectionSpacing}>
      {/* <b>面试官必读</b> */}
      <UnorderedList>
        <ListItem>
          <T>用</T>
          <Icon as={BsWechat} marginX={1.5} />
          <T>微信发起视频群聊。</T>
        </ListItem>
        {first !== null && (
          <>
            <ListItem>
              <mark>
                <T>你负责提问维度</T> {first ? firstHalf : secondHalf}{" "}
              </mark>
              ；{otherName}
              <T>负责维度</T> {first ? secondHalf : firstHalf} 。
            </ListItem>
            <ListItem>
              <mark>
                <T>填写所有</T>
                {isMentee ? "八" : "十"}
                <T>个维度</T>
              </mark>
              <T>的评价和总评。</T>
            </ListItem>
          </>
        )}

        {isMentee ? (
          <>
            <ListItem>
              <Link
                isExternal
                href="https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064"
              >
                <T>考察维度和参考题库</T> <ExternalLinkIcon />
              </Link>
            </ListItem>
            <ListItem>
              <Link
                isExternal
                href="https://www.notion.so/yuanjian/4616bf621b5b41fbbd62477d66d87ffe"
              >
                <T>面试须知</T> <ExternalLinkIcon />
              </Link>
            </ListItem>
          </>
        ) : (
          <>
            <ListItem>
              <Link
                isExternal
                href="https://www.notion.so/yuanjian/7ded3b1de3ef4c35a2a669a4c6bc7ac1"
              >
                <T>导师面试流程和标准</T> <ExternalLinkIcon />
              </Link>
            </ListItem>
          </>
        )}
      </UnorderedList>
    </Flex>
  );
}
