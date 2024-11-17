import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Flex, Grid, GridItem, Heading, Link, Box
} from '@chakra-ui/react';
import { breakpoint } from 'theme/metrics';
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
      {i.type == "MenteeInterview" ?
        <Link isExternal 
          href="https://www.notion.so/yuanjian/0de91c837f1743c3a3ecdedf78f9e064">
          考察维度和参考题库 <ExternalLinkIcon />
        </Link>
        :
        <Link isExternal 
          href="https://www.notion.so/yuanjian/7ded3b1de3ef4c35a2a669a4c6bc7ac1">
          导师面试流程和标准 <ExternalLinkIcon />
        </Link>
      }
    </Box>

    <Grid
      gap={sectionSpacing}
      templateColumns={{ 
        base: "100%", 
        [breakpoint]: `repeat(${i.feedbacks.length + 1}, 1fr)`,
      }}
    >
      {i.feedbacks
        // Fix dislay order
        .sort((f1, f2) => compareUUID(f1.id, f2.id))
        .map(f => <GridItem key={f.id}>
          <Flex direction="column" gap={sectionSpacing}>
            <Heading size="md">{formatUserName(f.interviewer.name)}</Heading>
            <InterviewFeedbackEditor type={i.type} interviewFeedbackId={f.id} 
              readonly={readonly || me.id !== f.interviewer.id} />
          </Flex>
        </GridItem>
      )}

      <GridItem>
        <Flex direction="column" gap={sectionSpacing}>

          <Heading size="md">面试讨论</Heading>
          <InterviewDecisionEditor type={i.type} interviewId={interviewId} 
            decision={i.decision} etag={data.etag} readonly={readonly} />

          <Applicant userId={i.interviewee.id} type={i.type} showTitle />
        </Flex>
      </GridItem>
    </Grid>
  </Flex>;
}
