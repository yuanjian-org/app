import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem, Heading, Text } from '@chakra-ui/react';
import { sidebarBreakpoint } from 'components/Navbars';
import _ from "lodash";
import MenteeApplication from 'components/MenteeApplication';
import { sectionSpacing } from 'theme/metrics';
import InterviewFeedbackEditor from 'components/InterviewFeedbackEditor';
import { formatUserName } from 'shared/strings';
import { useUserContext } from 'UserContext';

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
        .sort((f1, f2) => f1.id.localeCompare(f2.id))
        .map(f => <GridItem key={f.id}>
        <Flex direction="column" gap={sectionSpacing}>
          <Heading size="md">{formatUserName(f.interviewer.name, "formal")}</Heading>
          <InterviewFeedbackEditor feedbackId={f.id} readonly={me.id !== f.interviewer.id} />
        </Flex>
      </GridItem>)}

      <GridItem>
        {interview.type == "MenteeInterview" ?
          <MenteeApplication 
            menteeUserId={interview.interviewee.id}
            title={formatUserName(interview.interviewee.name, "formal")}
          />
          : 
          <Text>（导师申请材料页尚未实现）</Text>
        }
      </GridItem>
    </Grid>
  </>;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;
