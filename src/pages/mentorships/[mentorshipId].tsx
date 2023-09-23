import { useRouter } from 'next/router';
import { parseQueryStringOrUnknown } from "shared/strings";
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem, Text, TabList, TabPanels, Tab, TabPanel, Tooltip, Textarea } from '@chakra-ui/react';
import GroupBar from 'components/GroupBar';
import { sidebarBreakpoint } from 'components/Navbars';
import { AutosavingMarkdownEditor } from 'components/MarkdownEditor';
import AssessmentsPanel from 'components/AssessmentsPanel';
import { PrivateMentorNotes } from 'shared/Partnership';
import { QuestionIcon } from '@chakra-ui/icons';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import MobileExperienceAlert from 'components/MobileExperienceAlert';
import MenteeApplicant from 'components/MenteeApplicant';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import Transcripts from 'components/Transcripts';
import { widePage } from 'AppPage';
import { useUserContext } from 'UserContext';

export default widePage(() => {
  const mentorshipId = parseQueryStringOrUnknown(useRouter(), 'mentorshipId');
  const { data: mentorship } = trpcNext.partnerships.get.useQuery(mentorshipId);
  const [user] = useUserContext();

  if (!mentorship) return <Loader />;

  const iAmMentor = mentorship.mentor.id === user.id;

  return <>
    <MobileExperienceAlert marginBottom={paragraphSpacing} />
    {iAmMentor && 
      <GroupBar group={mentorship.group} showJoinButton showGroupName={false} marginBottom={sectionSpacing + 2} />
    }
    <Grid gap={10} templateColumns={{ 
      base: "1fr", 
      [sidebarBreakpoint]: "2fr 1fr", // "0.618fr 0.382fr",
    }}>
      <GridItem>
        <MenteeTabs partnershipId={mentorshipId} menteeId={mentorship.mentee.id} groupId={mentorship.group.id} />
      </GridItem>
      <GridItem>
        <MentorPrivateNotes
          partnershipId={mentorshipId}
          notes={mentorship.privateMentorNotes}
          readonly={!iAmMentor}
        />
      </GridItem>
    </Grid>
  </>;
});

function MentorPrivateNotes({ partnershipId, notes, readonly }: { 
  partnershipId: string,
  notes: PrivateMentorNotes | null,
  readonly: boolean,
}) {

  const save = async (editedMemo: string) => {
    await trpc.partnerships.updatePrivateMentorNotes.mutate({ 
      id: partnershipId, 
      privateMentorNotes: { memo: editedMemo },
    });
  };

  return <Flex direction="column" gap={6}>
    <Flex alignItems="center">
      <b>导师笔记</b>
      <Tooltip label="学生无法看到笔记内容。详见《谁能看到我的数据》页。">
        <QuestionIcon color="gray" marginStart={2} />
      </Tooltip>
    </Flex>
    {readonly ? <Textarea isReadOnly value={notes?.memo || ""} minHeight={200} /> : 
      <AutosavingMarkdownEditor key={partnershipId} initialValue={notes?.memo || ""} onSave={save} />
    }
  </Flex>;
}

function MenteeTabs({ partnershipId, menteeId, groupId }: {
  partnershipId: string,
  menteeId: string,
  groupId: string,
}) {

  const TabHead = ({ children }: any) => <Text>{children}</Text>;

  return <TabsWithUrlParam isFitted isLazy>
    <TabList>
      <Tab><TabHead>通话摘要</TabHead></Tab>
      <Tab><TabHead>申请材料</TabHead></Tab>
      <Tab><TabHead>跟踪评估</TabHead></Tab>
    </TabList>

    <TabPanels>
      <TabPanel>
        <Transcripts groupId={groupId} />
      </TabPanel>
      <TabPanel>
        <MenteeApplicant userId={menteeId} readonly />
      </TabPanel>
      <TabPanel>
        <AssessmentTabPanel partnershipId={partnershipId} />
      </TabPanel>
    </TabPanels>
  </TabsWithUrlParam>;
}

function AssessmentTabPanel({ partnershipId }: {
  partnershipId: string,
}) {
  const { data: assessments } = trpcNext.assessments.listAllForMentorship.useQuery(partnershipId);
  // @ts-expect-error so weird
  return <AssessmentsPanel partnershipId={partnershipId} assessments={assessments} />;
}
