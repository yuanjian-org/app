import { useRouter } from 'next/router';
import { formatUserName, parseQueryStringOrUnknown, prettifyDate } from "shared/strings";
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Text, TabList, TabPanels, Tab, TabPanel, Tbody, Td, Table,
  Stack,
} from '@chakra-ui/react';
import GroupBar from 'components/GroupBar';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import MenteeApplicant from 'components/MenteeApplicant';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import Transcripts from 'components/Transcripts';
import { widePage } from 'AppPage';
import { useUserContext } from 'UserContext';
import PageBreadcrumb from 'components/PageBreadcrumb';
import TrLink from 'components/TrLink';
import ChatRoom from 'components/ChatRoom';
import { Mentorship } from 'shared/Mentorship';

export default widePage(() => {
  const mentorshipId = parseQueryStringOrUnknown(useRouter(), 'mentorshipId');
  const { data: m } = trpcNext.mentorships.get.useQuery(mentorshipId);

  return !m ? <Loader /> : <>
    <PageBreadcrumb current={`${formatUserName(m.mentee.name)}`} />
    <MenteeTabs mentorship={m} />
  </>;
});

function MenteeTabs({ mentorship }: {
  mentorship: Mentorship,
}) {
  return <TabsWithUrlParam isLazy>
    <TabList>
      <Tab>一对一导师通话</Tab>
      <Tab>内部笔记</Tab>
      <Tab>申请材料</Tab>
      <Tab>年度反馈</Tab>
    </TabList>

    <TabPanels>
      <TabPanel>
        <MentorshipPanel mentorship={mentorship} />
      </TabPanel>
      <TabPanel>
        <Text color="grey" marginBottom={paragraphSpacing}>
          在此记录学生情况或者与资深导师交流。学生无法看到此页。
        </Text>
        <ChatRoom mentorshipId={mentorship.id} />
      </TabPanel>
      <TabPanel>
        <MenteeApplicant userId={mentorship.mentee.id} />
      </TabPanel>
      <TabPanel>
        <AssessmentsTable mentorshipId={mentorship.id} />
      </TabPanel>
    </TabPanels>
  </TabsWithUrlParam>;
}

function MentorshipPanel({ mentorship: m }: {
  mentorship: Mentorship,
}) {
  const [me] = useUserContext();

  return <Stack spacing={sectionSpacing} marginTop={sectionSpacing}>
    {m.mentor.id === me.id ?
      <GroupBar group={m.group} showJoinButton showGroupName={false} />
      :
      <b>导师： {formatUserName(m.mentor.name)}</b>}
    <Transcripts groupId={m.group.id} />
  </Stack>;
}

function AssessmentsTable({ mentorshipId }: {
  mentorshipId: string,
}) {
  const router = useRouter();
  const { data: assessments } = trpcNext.assessments.listAllForMentorship.useQuery({ mentorshipId });

  const createAndGo = async () => {
    const id = await trpc.assessments.create.mutate({ mentorshipId: mentorshipId });
    router.push(`/mentorships/${mentorshipId}/assessments/${id}`);
  };

  return !assessments ? <Loader /> : !assessments.length ? <Text color="grey">无反馈内容。</Text> : <Table>
    <Tbody>
      {assessments.map(a => <TrLink key={a.id} href={`/mentorships/${mentorshipId}/assessments/${a.id}`}>
        {/* Weird that Asseessment.createdAt must have optional() to suppress ts's complaint */}
        <Td>{a.createdAt && prettifyDate(a.createdAt)}</Td>
        <Td>{a.summary ?? ""}</Td>
      </TrLink>)}
    </Tbody>
  </Table>;
}
