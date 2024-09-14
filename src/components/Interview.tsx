import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Flex, Grid, GridItem, Heading, Link, Box
} from '@chakra-ui/react';
import { sidebarBreakpoint } from 'components/Navbars';
import Applicant from 'components/Applicant';
import { sectionSpacing } from 'theme/metrics';
import {
  InterviewDecisionEditor, InterviewFeedbackEditor 
} from 'components/InterviewEditor';
import { formatUserName, compareUUID } from 'shared/strings';
import { useUserContext } from 'UserContext';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import MobileExperienceAlert from 'components/MobileExperienceAlert';

export default function Interview({ interviewId, hasTitle, readonly }: {
  interviewId: string, 
  hasTitle?: boolean,
  readonly?: boolean,
}) {
  // See Editor()'s comment on the reason for `catchTime: 0`
  const { data } = trpcNext.interviews.get.useQuery({ interviewId },
    { cacheTime: 0 });
  const [me] = useUserContext();

  if (!data) return <Loader />;
  const i = data.interviewWithGroup;

  return <Flex direction="column" gap={sectionSpacing}>

    {hasTitle && 
      <Heading size="md">候选人：{formatUserName(i.interviewee.name)}</Heading>
    }

    <MobileExperienceAlert />

    <Box>
      <Link isExternal 
        href="https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064"
      >
        考察维度和参考题库 <ExternalLinkIcon />
      </Link>
    </Box>

    <Grid
      gap={sectionSpacing}
      templateColumns={{ 
        base: "100%", 
        [sidebarBreakpoint]: `repeat(${i.feedbacks.length + 1}, 1fr)`,
      }}
    >
      {i.feedbacks
        // Fix dislay order
        .sort((f1, f2) => compareUUID(f1.id, f2.id))
        .map(f => <GridItem key={f.id}>
          <Flex direction="column" gap={sectionSpacing}>
            <Heading size="md">{formatUserName(f.interviewer.name)}</Heading>
            <InterviewFeedbackEditor interviewFeedbackId={f.id} 
              readonly={readonly || me.id !== f.interviewer.id} />
          </Flex>
        </GridItem>
      )}

      <GridItem>
        <Flex direction="column" gap={sectionSpacing}>

          <Heading size="md">面试讨论</Heading>
          <InterviewDecisionEditor interviewId={interviewId} 
            decision={i.decision} etag={data.etag} readonly={readonly} />

          <Applicant userId={i.interviewee.id} type={i.type} showTitle />
        </Flex>
      </GridItem>
    </Grid>
  </Flex>;
}
