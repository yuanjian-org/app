import { useRouter } from 'next/router';
import { formatUserName, parseQueryStringOrUnknown, prettifyDate } from "shared/strings";
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Grid, GridItem, Text, TabList, TabPanels, Tabs, Tab, TabPanel, Tooltip, Textarea, Tbody, Td, Table,
} from '@chakra-ui/react';
import GroupBar from 'components/GroupBar';
import { sidebarBreakpoint } from 'components/Navbars';
import { AutosavingMarkdownEditor } from 'components/MarkdownEditor';
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
import Assessment from 'shared/Assessment';
import TrLink from 'components/TrLink';

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
        <MenteeTabs mentorshipId={mentorshipId} menteeId={m.mentee.id} groupId={m.group.id} />
      </GridItem>
      <GridItem>
        <MentorPrivateNotes
          mentorshipId={mentorshipId}
          notes={m.privateMentorNotes}
          readonly={!iAmTheMentor}
        />
      </GridItem>
    </Grid>
  </>;
});

function MentorPrivateNotes({ mentorshipId, notes, readonly }: { 
  mentorshipId: string,
  notes: PrivateMentorNotes | null,
  readonly: boolean,
}) {

  const save = async (editedMemo: string) => {
    await trpc.partnerships.updatePrivateMentorNotes.mutate({ 
      id: mentorshipId, 
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
          <AutosavingMarkdownEditor key={mentorshipId} initialValue={notes?.memo || ""} onSave={save} />
        }
      </TabPanel>
    </TabPanels>
  </Tabs>;
}

function MenteeTabs({ mentorshipId, menteeId, groupId }: {
  mentorshipId: string,
  menteeId: string,
  groupId: string,
}) {

  const TabHead = ({ children }: any) => <Text>{children}</Text>;

  return <TabsWithUrlParam isFitted isLazy>
    <TabList>
      <Tab><TabHead>通话摘要</TabHead></Tab>
      <Tab><TabHead>申请材料</TabHead></Tab>
      <Tab><TabHead>反馈与评估</TabHead></Tab>
    </TabList>

    <TabPanels>
      <TabPanel>
        <Transcripts groupId={groupId} />
      </TabPanel>
      <TabPanel>
        <MenteeApplicant userId={menteeId} readonly />
      </TabPanel>
      <TabPanel>
        <AssessmentTabPanel mentorshipId={mentorshipId} />
      </TabPanel>
    </TabPanels>
  </TabsWithUrlParam>;
}

function AssessmentTabPanel({ mentorshipId }: {
  mentorshipId: string,
}) {
  const { data: assessments } = trpcNext.assessments.listAllForMentorship.useQuery({ mentorshipId });
  return !assessments ? <Loader /> : <AssessmentsTable mentorshipId={mentorshipId} assessments={assessments} />;
}

function AssessmentsTable({ mentorshipId, assessments } : {
  mentorshipId: string,
  assessments: Assessment[],
}) {
  const router = useRouter();
  const createAndGo = async () => {
    const id = await trpc.assessments.create.mutate({ partnershipId: mentorshipId });
    router.push(`/mentorships/${mentorshipId}/assessments/${id}`);
  };

  return !assessments.length ? <Text color="grey">无反馈。</Text> : <Table>
    <Tbody>
      {assessments.map(a => <TrLink key={a.id} href={`/mentorships/${mentorshipId}/assessments/${a.id}`}>
        {/* @ts-expect-error weird that Asseessment.createdAt must have optional() */}
        <Td>{prettifyDate(a.createdAt)}</Td>
        <Td>{a.summary ?? ""}</Td>
      </TrLink>)}
    </Tbody>
  </Table>;
}
