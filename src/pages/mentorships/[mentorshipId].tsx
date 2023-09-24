import { useRouter } from 'next/router';
import { formatUserName, parseQueryStringOrUnknown } from "shared/strings";
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Grid, GridItem, Text, TabList, TabPanels, Tabs, Tab, TabPanel, Tooltip, Textarea
} from '@chakra-ui/react';
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
import PageBreadcrumb from 'components/PageBreadcrumb';

export default widePage(() => {
  const mentorshipId = parseQueryStringOrUnknown(useRouter(), 'mentorshipId');
  const { data: m } = trpcNext.partnerships.get.useQuery(mentorshipId);
  const [user] = useUserContext();

  if (!m) return <Loader />;

  const iAmTheMentor = m.mentor.id === user.id;

  return <>
    <MobileExperienceAlert marginBottom={paragraphSpacing} />

    {iAmTheMentor ?
      <GroupBar group={m.group} showJoinButton showGroupName={false} marginBottom={sectionSpacing + 2} />
      :
      <PageBreadcrumb current={`${formatUserName(m.mentee.name)} ⇋ ${formatUserName(m.mentor.name)}`} />
    }

    <Grid gap={10} templateColumns={{ 
      base: "1fr", 
      [sidebarBreakpoint]: "2fr 1fr", // "0.618fr 0.382fr",
    }}>
      <GridItem>
        <MenteeTabs partnershipId={mentorshipId} menteeId={m.mentee.id} groupId={m.group.id} />
      </GridItem>
      <GridItem>
        <MentorPrivateNotes
          partnershipId={mentorshipId}
          notes={m.privateMentorNotes}
          readonly={!iAmTheMentor}
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

  return <Tabs isFitted>
    <TabList>
      <Tab>
        导师笔记
        <Tooltip label="学生无法看到笔记内容。详见《谁能看到我的数据》页。">
          <QuestionIcon color="gray" marginStart={2} />
        </Tooltip>
      </Tab>
    </TabList>

    <TabPanels>
      <TabPanel>
        {readonly ?
          <Textarea isReadOnly value={notes?.memo || ""} minHeight={200} />
          :
          <AutosavingMarkdownEditor key={partnershipId} initialValue={notes?.memo || ""} onSave={save} />
        }
      </TabPanel>
    </TabPanels>
  </Tabs>;
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
