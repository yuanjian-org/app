import { useRouter } from 'next/router';
import { formatUserName, parseQueryStringOrUnknown, prettifyDate } from "shared/strings";
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Text, TabList, TabPanels, Tab, TabPanel, Tooltip, Tbody, Td, Table,
} from '@chakra-ui/react';
import GroupBar from 'components/GroupBar';
import { QuestionIcon } from '@chakra-ui/icons';
import { paragraphSpacing, sectionSpacing } from 'theme/metrics';
import MobileExperienceAlert from 'components/MobileExperienceAlert';
import MenteeApplicant from 'components/MenteeApplicant';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import Transcripts from 'components/Transcripts';
import { widePage } from 'AppPage';
import { useUserContext } from 'UserContext';
import PageBreadcrumb from 'components/PageBreadcrumb';
import TrLink from 'components/TrLink';
import ChatRoom from 'components/ChatRoom';

export default widePage(() => {
  const mentorshipId = parseQueryStringOrUnknown(useRouter(), 'mentorshipId');
  const { data: m } = trpcNext.mentorships.get.useQuery(mentorshipId);
  const [user] = useUserContext();

  if (!m) return <Loader />;

  const iAmTheMentor = m.mentor.id === user.id;

  return <>
    <MobileExperienceAlert marginBottom={paragraphSpacing} />

    {iAmTheMentor ?
      <GroupBar group={m.group} showJoinButton showGroupName={false} marginBottom={sectionSpacing + 2} />
      :
      <PageBreadcrumb current={`学生：${formatUserName(m.mentee.name)}，导师： ${formatUserName(m.mentor.name)}`} />
    }

    <MenteeTabs mentorshipId={mentorshipId} menteeId={m.mentee.id} groupId={m.group.id} />
  </>;
});

function MenteeTabs({ mentorshipId, menteeId, groupId }: {
  mentorshipId: string,
  menteeId: string,
  groupId: string,
}) {

  return <TabsWithUrlParam isLazy>
    <TabList>
      <Tab>
        内部讨论
        <Tooltip label="仅导师本人和资深导师可见。学生无法访问。">
          <QuestionIcon color="gray" marginStart={2} />
        </Tooltip>
      </Tab>
      <Tab>通话摘要</Tab>
      <Tab>申请材料</Tab>
      <Tab>年度反馈</Tab>
    </TabList>

    <TabPanels>
      <TabPanel>
        <ChatRoom mentorshipId={mentorshipId} />
      </TabPanel>
      <TabPanel>
        <Transcripts groupId={groupId} />
      </TabPanel>
      <TabPanel>
        <MenteeApplicant userId={menteeId} readonly />
      </TabPanel>
      <TabPanel>
        <AssessmentsTable mentorshipId={mentorshipId} />
      </TabPanel>
    </TabPanels>
  </TabsWithUrlParam>;
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
