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
import { breakpoint } from 'theme/metrics';
import invariant from "tiny-invariant";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { formatUserName } from 'shared/strings';
import Applicant from 'components/Applicant';
import { BsWechat } from "react-icons/bs";
import { MinUser } from 'shared/User';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import moment from "moment";
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import { InterviewFeedbackEditor } from 'components/InterviewEditor';
import { widePage } from 'AppPage';
import { useMyId } from 'useMe';
import { InterviewType } from 'shared/InterviewType';
import { useCallback } from 'react';

export default widePage(() => {
  const interviewId = parseQueryString(useRouter(), 'interviewId');
  const { data } = interviewId ?
    trpcNext.interviews.get.useQuery({ interviewId }) : { data: undefined };

  const myId = useMyId();
  const { data: state } = trpcNext.users.getUserState.useQuery();

  const interviewerExamPassed = useCallback(() => {
    if (process.env.NODE_ENV !== 'production') return true;
    const passed = state?.menteeInterviewerExam;
    // 300 days instead of 365 days is to allow interviewers to retake
    // the exam **before** the start of the next interview cycle.
    return passed ? moment().diff(moment(passed), "days") < 300 : false;
  }, [state]);

  if (!data) return <Loader />;

  const i = data.interviewWithGroup;

  const getMyFeedbackId = useCallback(() => {
    const feedbacks = i.feedbacks.filter(f => f.interviewer.id === myId);
    invariant(feedbacks.length == 1);
    return feedbacks[0].id;
  }, [i, myId]);

  return <>
    <PageBreadcrumb current={formatUserName(i.interviewee.name)} parents={[{
      name: "我的面试", link: "/interviews/mine",
    }]}/>

    {!interviewerExamPassed() ? <PassExamFirst type={i.type} /> :
      <Grid templateColumns={{ base: "100%", [breakpoint]: "1fr 1fr" }}
        gap={sectionSpacing}>
        <GridItem>
          <Flex direction="column" gap={sectionSpacing}>
            <Instructions type={i.type}
              interviewers={i.feedbacks.map(f => f.interviewer)} />
            <InterviewFeedbackEditor type={i.type}
              interviewFeedbackId={getMyFeedbackId()} />
          </Flex>
        </GridItem>
        <GridItem>
          <Applicant userId={i.interviewee.id} type={i.type} showTitle /> 
        </GridItem>
      </Grid>
    }
  </>;
});

function PassExamFirst({ type } : { type : InterviewType}) {
  return <Flex direction="column" gap={paragraphSpacing}>
    <p>请首先完成<Link isExternal href="https://jsj.top/f/w02l95">
      《面试流程和标准评测》</Link>，即可看到面试信息。</p>
    {type == "MentorInterview" &&
      <p>导师面试的原则与学生面试一样，因此使用同样的测试题目。</p>}
    <p>为了加强记忆，我们要求面试官每年重新评测一次，感谢理解！</p>
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
