import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem,
  Text,
  Icon,
  Link,
  UnorderedList,
  ListItem,
} from '@chakra-ui/react';
import { sidebarBreakpoint } from 'components/Navbars';
import { useUserContext } from 'UserContext';
import invariant from "tiny-invariant";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { formatUserName } from 'shared/strings';
import _ from "lodash";
import MenteeApplicant from 'components/MenteeApplicant';
import { BsWechat } from "react-icons/bs";
import { MinUser } from 'shared/User';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import moment from "moment";
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import { InterviewFeedbackEditor } from 'components/InterviewEditor';

const Page: NextPageWithLayout = () => {
  const interviewId = parseQueryParameter(useRouter(), 'interviewId');
  const { data } = trpcNext.interviews.get.useQuery(interviewId);
  const { data: meNoCache } = trpcNext.users.meNoCache.useQuery();
  const [me] = useUserContext();

  const interviewerTestPassed = () => {
    const passed = meNoCache?.menteeInterviewerTestLastPassedAt;
    return passed ? moment().diff(moment(passed), "days") < 300 : false;
  }

  if (!data) return <Loader />;

  const i = data.interviewWithGroup;

  const getMyFeedbackId = () => {
    const feedbacks = i.feedbacks.filter(f => f.interviewer.id === me.id);
    invariant(feedbacks.length == 1);
    return feedbacks[0].id;
  };

  return <>
    <PageBreadcrumb current={formatUserName(i.interviewee.name, "formal")} parents={[{
      name: "我的面试", link: "/interviews/mine",
    }]}/>

    {/* <GroupBar group={interview.group} showGroupName={false} showJoinButton marginBottom={8} /> */}

    {!meNoCache ? <Loader /> : !interviewerTestPassed() ? <PassTestFirst /> :
      <Grid templateColumns={{ base: "100%", [sidebarBreakpoint]: "1fr 1fr" }} gap={sectionSpacing}>
        <GridItem>
          <Flex direction="column" gap={sectionSpacing}>
            <Instructions interviewers={i.feedbacks.map(f => f.interviewer)} />
            <InterviewFeedbackEditor interviewFeedbackId={getMyFeedbackId()} />
          </Flex>
        </GridItem>
        <GridItem>
          {i.type == "MenteeInterview" ? 
            <MenteeApplicant userId={i.interviewee.id} readonly /> 
            : 
            <Text>（导师申请材料页尚未实现）</Text>
          }
        </GridItem>
      </Grid>
    }
  </>;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;

function PassTestFirst() {
  return <Flex direction="column" gap={paragraphSpacing}>
    <b>请首先完成面试官测试</b>
    <p>通过<Link isExternal href="https://jinshuju.net/f/w02l95">《面试流程和标准测试》</Link>后，刷新此页，即可看到面试信息。</p>
  </Flex>;
}

function Instructions({ interviewers }: {
  interviewers: MinUser[],
}) {
  const [me] = useUserContext();

  let first: boolean | null = null;
  let other: MinUser | null = null;
  invariant(interviewers.filter(i => i.id === me.id).length == 1);
  if (interviewers.length == 2) {
    other = interviewers[0].id === me.id ? interviewers[1] : interviewers[0];
    first = other.id > me.id;
  }

  const marginEnd = 1.5;
  return <Flex direction="column" gap={sectionSpacing}>
    {/* <b>面试官必读</b> */}
    <UnorderedList>
      <ListItem>用<Icon as={BsWechat} marginX={1.5} />微信发起视频群聊。</ListItem>
      {first !== null && <>
        <ListItem>
          你负责<mark>提问维度 {first ? "1 到 4" : "5 到 8"} 的问题</mark>；
          {formatUserName(other?.name ?? null, "friendly")}负责维度 {first ? "5 到 8" : "1 到 4"} 的问题。
        </ListItem>
        <ListItem><mark>填写所有八个维度</mark>的评价和总评。</ListItem>
      </>}
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
    </UnorderedList>
  </Flex>;
}
