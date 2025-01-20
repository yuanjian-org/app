import { useRouter } from 'next/router';
import { parseQueryString } from "shared/strings";
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Flex, Grid, GridItem,
  Icon,
  Link,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { breakpoint, maxTextWidth } from 'theme/metrics';
import invariant from "tiny-invariant";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { formatUserName } from 'shared/strings';
import Applicant from 'components/Applicant';
import { BsWechat } from "react-icons/bs";
import { MinUser } from 'shared/User';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import { InterviewFeedbackEditor } from 'components/InterviewEditor';
import { widePage } from 'AppPage';
import { useMyId } from 'useMe';
import { InterviewType } from 'shared/InterviewType';
import { useMemo } from 'react';
import NextLink from 'next/link';
import { interviewExamExpiryDays, isExamExpired } from "shared/exams";
import { isProd } from "shared/isProd";

export default widePage(() => {
  const interviewId = parseQueryString(useRouter(), 'interviewId');
  const { data } = interviewId ?
    trpcNext.interviews.get.useQuery({ interviewId }) : { data: undefined };

  const myId = useMyId();
  const { data: state } = trpcNext.users.getUserState.useQuery();

  const needCommsExam = useMemo(() => {
    if (!isProd()) return false;
    if (state === undefined) return undefined;
    return isExamExpired(state.commsExam);
  }, [state]);

  const needInterviewExam = useMemo(() => {
    if (!isProd()) return false;
    if (state === undefined) return undefined;
    return isExamExpired(state.menteeInterviewerExam, interviewExamExpiryDays);
  }, [state]);

  const myFeedbackId = useMemo(() => {
    if (!data) return undefined;
    const feedbacks = data.interviewWithGroup.feedbacks.filter(
      f => f.interviewer.id === myId);
    invariant(feedbacks.length == 1);
    return feedbacks[0].id;
  }, [data, myId]);

  const i = data?.interviewWithGroup;

  return i === undefined || needInterviewExam === undefined ||
    needCommsExam === undefined ? <Loader />
    :
    needInterviewExam || needCommsExam ? <NeedExams
      type={i.type}
      interview={needInterviewExam}
      comms={needCommsExam}
    /> 
    :
    <>
      <PageBreadcrumb current={formatUserName(i.interviewee.name)} parents={[{
        name: "我的面试", link: "/interviews/mine",
      }]}/>

      <Grid templateColumns={{ base: "100%", [breakpoint]: "1fr 1fr" }}
        gap={sectionSpacing}>
        <GridItem>
          <Flex direction="column" gap={sectionSpacing}>
            <Instructions type={i.type}
              interviewers={i.feedbacks.map(f => f.interviewer)} />
            <InterviewFeedbackEditor type={i.type}
              interviewFeedbackId={myFeedbackId ?? ""} />
          </Flex>
        </GridItem>
        <GridItem>
          <Applicant userId={i.interviewee.id} type={i.type} showTitle /> 
        </GridItem>
      </Grid>
    </>;
});

function NeedExams({ type, interview, comms } : {
  type : InterviewType,
  interview : boolean,
  comms : boolean,
}) {
  invariant(comms || interview);

  return <Flex direction="column" gap={paragraphSpacing} maxW={maxTextWidth}>
    <p>
      请首先完成
      {comms &&
        <Link as={NextLink} href="/study/comms">《学生通信原则》自学与评测</Link>}
      {comms && interview && " 以及"}
      {interview &&
        <Link as={NextLink} href="/study/interview">
          面试官自学与评测</Link>}
      ，即可看到面试信息。
    </p>

    {type == "MentorInterview" &&
      <p>导师面试的原则与学生面试一样，因此使用同样的测试题目。</p>}

    <p>我们邀请面试官每年重新评测一次，感谢你的理解与支持。</p>
  </Flex>;
}

function Instructions({ type, interviewers }: {
  type: InterviewType,
  interviewers: MinUser[],
}) {
  const myId = useMyId();

  let first: boolean | null = null;
  let other: MinUser | null = null;
  invariant(interviewers.filter(i => i.id === myId).length == 1);
  if (interviewers.length == 2) {
    other = interviewers[0].id === myId ? interviewers[1] : interviewers[0];
    first = other.id > myId;
  }

  const isMentee = type == "MenteeInterview";
  const firstHalf = isMentee ? "1 到 4" : "1 到 5";
  const secondHalf = isMentee ? "5 到 8" : "6 到 10";
  const otherName = formatUserName(other?.name ?? null, "friendly");

  return <Flex direction="column" gap={sectionSpacing}>
    {/* <b>面试官必读</b> */}
    <UnorderedList>
      <ListItem>用<Icon as={BsWechat} marginX={1.5} />微信发起视频群聊。</ListItem>
      {first !== null && <>
        <ListItem>
          <mark>你负责提问维度 {first ? firstHalf : secondHalf} </mark>；
          {otherName}负责维度 {first ? secondHalf : firstHalf} 。
        </ListItem>
        <ListItem><mark>填写所有{isMentee ? '八' : '十'}个维度</mark>的评价和总评。</ListItem>
      </>}

      {isMentee ? <>
        <ListItem>
          <Link isExternal href="https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064">
            考察维度和参考题库 <ExternalLinkIcon />
          </Link>
        </ListItem>
        <ListItem>
          <Link isExternal href="https://www.notion.so/yuanjian/4616bf621b5b41fbbd62477d66d87ffe">
            面试须知 <ExternalLinkIcon />
          </Link>
        </ListItem>
      </> : <>
        <ListItem>
          <Link isExternal href="https://www.notion.so/yuanjian/7ded3b1de3ef4c35a2a669a4c6bc7ac1">
            导师面试流程和标准 <ExternalLinkIcon />
          </Link>
        </ListItem>        
      </>}
    </UnorderedList>
  </Flex>;
}
