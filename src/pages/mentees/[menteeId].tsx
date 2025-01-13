import { useRouter } from 'next/router';
import { formatUserName, parseQueryString, prettifyDate } from "shared/strings";
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  TabList, TabPanels, Tab, TabPanel, Stack,
  Text,
  HStack,
  Flex,
  SimpleGrid,
  GridItem,
  Link,
} from '@chakra-ui/react';
import Applicant from 'components/Applicant';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { widePage } from 'AppPage';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { MinUser } from 'shared/User';
import ChatRoom from 'components/ChatRoom';
import { Mentorship } from 'shared/Mentorship';
import GroupBar from 'components/GroupBar';
import { breakpoint, paragraphSpacing, sectionSpacing, maxTextWidth } from 'theme/metrics';
import Transcripts from 'components/Transcripts';
import Interview from 'components/Interview';
import { MentorshipStatusIcon } from 'pages/mentees';
import { RoleProfiles } from 'shared/Role';
import { useMyId } from 'useMe';
import { useMemo } from 'react';
import NextLink from 'next/link';
import invariant from 'tiny-invariant';
import { examsEnabled, isExamExpired } from "exams";

export default widePage(() => {
  const menteeId = parseQueryString(useRouter(), 'menteeId');
  const { data: mentee } = menteeId ? trpcNext.users.get.useQuery(menteeId) :
    { data: undefined };
  const { data: mentorships } = menteeId ? trpcNext.mentorships
    .listMentorshipsForMentee.useQuery({
      menteeId,
      includeEndedTransactional: false,
    }) : { data: undefined };

  const myId = useMyId();
  const { data: state } = trpcNext.users.getUserState.useQuery();

  const needCommsExam = useMemo(() => {
    if (!examsEnabled()) return false;
    if (state === undefined) return undefined;
    return isExamExpired(state.commsExam);
  }, [state]);

  const needHandbookExam = useMemo(() => {
    if (!examsEnabled()) return false;
    if (state === undefined || !mentorships) return undefined;
    
    // Exam is needed only if the current user has relational mentorship with
    // the mentee.
    const myRelational = mentorships
      .filter(m => !m.transactional && m.mentor.id == myId);
    if (myRelational.length == 0) return false;

    return isExamExpired(state.handbookExam);
  }, [state, mentorships, myId]);

  return (!mentee || !mentorships || 
    needCommsExam === undefined || needHandbookExam === undefined) ?
    <Loader /> :
      needCommsExam || needHandbookExam ? <NeedExams
        comms={needCommsExam}
        handbook={needHandbookExam}
      /> : <>
        <PageBreadcrumb current={`${formatUserName(mentee.name)}`} />
        <MenteeTabs mentee={mentee} mentorships={mentorships} />
      </>
    ;
});

function NeedExams({ comms, handbook }: {
  comms: boolean,
  handbook: boolean,
}) {
  invariant(comms || handbook);

  return <Flex direction="column" gap={paragraphSpacing} maxW={maxTextWidth}>
    <p>
      请首先完成
      {comms &&
        <Link as={NextLink} href="/study/comms">《学生通信原则》自学与评测</Link>}
      {comms && handbook && " 以及"}
      {handbook &&
        <Link as={NextLink} href="/study/handbook">《社会导师手册》自学与评测</Link>}
      ，即可看到学生页面，开始一对一通话。
    </p>

    <p>为了巩固记忆，我们邀请导师每年重新评测一次，感谢您的理解与支持。</p>
  </Flex>;
}

function MenteeTabs({ mentee, mentorships }: {
  mentee: MinUser,
  mentorships: Mentorship[],
}) {
  const myId = useMyId();
  const sorted = sortMentorship(mentorships, myId);

  return <TabsWithUrlParam isLazy>
    <TabList>
      {sorted.length == 1 ?
        <Tab>
          一对一通话{sorted[0].mentor.id !== myId &&
            `【${formatUserName(sorted[0].mentor.name)}】`}
        </Tab>
        :
        sorted.map(m =>
          <Tab key={m.id}>
            一对一通话{formatMentorshipTabSuffix(m, myId)}
          </Tab>
        )
      }
      <Tab>基本信息</Tab>
      <Tab>面试页</Tab>
      {/* <Tab>年度反馈</Tab> */}
    </TabList>

    <TabPanels>
      {sorted.map(m =>
        <TabPanel key={m.id}>
          <MentorshipPanel mentorship={m} />
        </TabPanel>
      )}
      <TabPanel>
        <Applicant type="MenteeInterview" userId={mentee.id} />
      </TabPanel>
      <InterviewTabPanel menteeId={mentee.id} />
      {/* <TabPanel>
        <AssessmentsTable mentorshipId={mentorship.id} />
      </TabPanel> */}
    </TabPanels>
  </TabsWithUrlParam>;
}

function InterviewTabPanel({ menteeId }: {
  menteeId: string
}) {
  const { data : interviewId, isLoading } = trpcNext.interviews.getIdForMentee
    .useQuery({ menteeId });
  return <TabPanel>
    {isLoading ? <Loader /> : 
      interviewId ? <Interview interviewId={interviewId} readonly /> :
        <Text color="gray">没有面试记录。</Text>
    }
  </TabPanel>;
}

function sortMentorship(ms: Mentorship[], myUserId: string): Mentorship[] {
  return [
    // Always put my mentorship as the first tab
    ...ms.filter(m => m.mentor.id == myUserId),
    // Then sort by ids
    ...ms.filter(m => m.mentor.id != myUserId).sort(
      (a, b) => a.id.localeCompare(b.id))
  ];
}

function formatMentorshipTabSuffix(m: Mentorship, myUserId: string): string {
  return `【${m.mentor.id == myUserId ? "我" : formatUserName(m.mentor.name)}】`;
}

function MentorshipPanel({ mentorship: m }: {
  mentorship: Mentorship,
}) {
  const myId = useMyId();

  return <Stack spacing={sectionSpacing} marginTop={sectionSpacing}>
    {m.transactional && m.endsAt && <HStack >
      <MentorshipStatusIcon m={m} />
      {/* After endsAt expires, listMentorshipsForMentee should not return
       this mentorship anymore, so we don't need to handle this case. */}
      <Text>此页将于{prettifyDate(m.endsAt)}失效。如需延期，请联系
        {RoleProfiles.MentorshipManager.displayName}。</Text>
    </HStack>}

    {!m.transactional && m.endsAt && <HStack >
      <MentorshipStatusIcon m={m} />
      <Text>一对一师生关系已于{prettifyDate(m.endsAt)}结束。</Text>
    </HStack>}

    <SimpleGrid
      templateColumns={{ base: "1fr", [breakpoint]: "1fr 1fr" }}
      spacing={sectionSpacing}
    >
      <GridItem>
        <Flex direction="column" gap={sectionSpacing}>
          {m.mentor.id === myId &&
            <GroupBar
              group={m.group}
              showJoinButton
              showGroupName={false}
              mb={sectionSpacing}
            />}

          <ChatRoom
            menteeId={m.mentee.id}
            newMessageButtonLabel="新内部笔记"
            paddingRight={{ base: 0, [breakpoint]: sectionSpacing }}
          />
          <Text size="sm" color="gray">内部笔记仅对导师可见。</Text>
        </Flex>
      </GridItem>
      <GridItem>
        <Transcripts group={m.group} />
      </GridItem>
    </SimpleGrid>

  </Stack>;
}

// function AssessmentsTable({ mentorshipId }: {
//   mentorshipId: string,
// }) {
//   const router = useRouter();
//   const { data: assessments } = trpcNext.assessments.listAllForMentorship.useQuery({ mentorshipId });

//   const createAndGo = async () => {
//     const id = await trpc.assessments.create.mutate({ mentorshipId: mentorshipId });
//     router.push(`/mentorships/${mentorshipId}/assessments/${id}`);
//   };

//   return !assessments ? <Loader /> : !assessments.length ? <Text color="gray">无反馈内容。</Text> : <Table>
//     <Tbody>
//       {assessments.map(a => <TrLink key={a.id} href={`/mentorships/${mentorshipId}/assessments/${a.id}`}>
//         {/* Weird that Asseessment.createdAt must have optional() to suppress ts's complaint */}
//         <Td>{a.createdAt && prettifyDate(a.createdAt)}</Td>
//         <Td>{a.summary ?? ""}</Td>
//       </TrLink>)}
//     </Tbody>
//   </Table>;
// }