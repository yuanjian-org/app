import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem, Heading, Text, Link } from '@chakra-ui/react';
import { sidebarBreakpoint } from 'components/Navbars';
import _ from "lodash";
import MenteeApplication from 'components/MenteeApplication';
import { sectionSpacing } from 'theme/metrics';
import InterviewFeedbackEditor from 'components/InterviewFeedbackEditor';
import { formatUserName, compareUUID } from 'shared/strings';
import { useUserContext } from 'UserContext';
import { ExternalLinkIcon } from '@chakra-ui/icons';

const Page: NextPageWithLayout = () => {
  const interviewId = parseQueryParameter(useRouter(), 'interviewId');
  const { data: interview } = trpcNext.interviews.get.useQuery(interviewId);
  const [me] = useUserContext();

  if (!interview) return <Loader />;

  return <>
    <Grid 
      templateColumns={{ base: "100%", [sidebarBreakpoint]: `repeat(${interview.feedbacks.length + 1}, 1fr)` }} 
      gap={sectionSpacing}
    >
      {interview.feedbacks
        // Fix dislay order
        .sort((f1, f2) => compareUUID(f1.id, f2.id))
        .map(f => <GridItem key={f.id}>
        <Flex direction="column" gap={sectionSpacing}>
          <Heading size="md">{formatUserName(f.interviewer.name, "formal")}</Heading>
          <InterviewFeedbackEditor feedbackId={f.id} readonly={me.id !== f.interviewer.id} />
        </Flex>
      </GridItem>)}

      <GridItem>
        <Flex direction="column" gap={sectionSpacing}>
          <OverallFeedbackEditor />
          {interview.type == "MenteeInterview" ?
            <MenteeApplication 
              menteeUserId={interview.interviewee.id}
              title={formatUserName(interview.interviewee.name, "formal")}
            />
            : 
            <Text>（导师申请材料页尚未实现）</Text>
          }
        </Flex>
      </GridItem>
    </Grid>
  </>;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;

function OverallFeedbackEditor() {
  return <>
    <Heading size="md">最终评价</Heading>
    <Text>TODO</Text>
    <Text>
      <Link isExternal href="https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064">
        面试维度和参考题库 <ExternalLinkIcon />
      </Link>
    </Text>
  </>;
}
