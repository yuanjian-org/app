import { useRouter } from 'next/router';
import { formatUserName, parseQueryString, prettifyDate, toChineseDayOfWeek } from "shared/strings";
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  TabList, TabPanels, Tab, TabPanel, Text,
  HStack,
  Flex,
  SimpleGrid,
  GridItem,
  Link, ModalHeader,
  ModalBody,
  ModalContent,
  ModalFooter,
  Button,
  ModalCloseButton, Select,
  VStack,
  Wrap,
  WrapItem, CardBody
} from '@chakra-ui/react';
import Applicant from 'components/Applicant';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { widePage } from 'AppPage';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { MinUser } from 'shared/User';
import ChatRoom from 'components/ChatRoom';
import { formatMentorshipSchedule, Mentorship, MentorshipSchedule } from 'shared/Mentorship';
import GroupBar from 'components/GroupBar';
import { breakpoint, paragraphSpacing, sectionSpacing, maxTextWidth, componentSpacing } from 'theme/metrics';
import Transcripts from 'components/Transcripts';
import Interview from 'components/Interview';
import { MentorshipStatusIcon } from 'pages/mentees';
import { RoleProfiles } from 'shared/Role';
import { useMyId } from 'useMe';
import { useMemo, useState } from 'react';
import NextLink from 'next/link';
import invariant from 'tiny-invariant';
import { isExamExpired } from "shared/exams";
import { isProd } from "shared/isProd";
import { MdEdit } from 'react-icons/md';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import _ from 'lodash';
import { IoMdCalendar } from 'react-icons/io';
import { ResponsiveCard } from 'components/ResponsiveCard';

export default widePage(() => {
  const menteeId = parseQueryString(useRouter(), 'menteeId');
  const { data: mentee } = trpcNext.users.get.useQuery(menteeId ?? "", {
    enabled: !!menteeId,
  });
  const { data: mentorships } = trpcNext.mentorships
    .listMentorshipsForMentee.useQuery({
      menteeId: menteeId ?? "",
      includeEndedTransactional: false,
    }, {
      enabled: !!menteeId,
    });

  const myId = useMyId();
  const { data: state } = trpcNext.users.getUserState.useQuery();

  const needCommsExam = useMemo(() => {
    if (!isProd()) return false;
    if (state === undefined) return undefined;
    return isExamExpired(state.commsExam);
  }, [state]);

  const needHandbookExam = useMemo(() => {
    if (!isProd()) return false;
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

    <p>我们邀请导师每年重新评测一次，感谢你的理解与支持。</p>
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
        <TabPanel key={m.id} px={0} pt={sectionSpacing}>
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
  return <SimpleGrid
    templateColumns={{ base: "1fr", [breakpoint]: "1fr 1fr" }}
    spacing={sectionSpacing}
  >
    <GridItem>
      <VStack align="stretch" gap={sectionSpacing}>
        <MentorshipSummaryCard m={m} />

        <ChatRoom menteeId={m.mentee.id} />
      </VStack>
    </GridItem>

    <GridItem>
      <Transcripts group={m.group} />
    </GridItem>
  </SimpleGrid>;
}

function MentorshipSummaryCard({ m }: {
  m: Mentorship,
}) {
  const myId = useMyId();

  return <ResponsiveCard>
    <CardBody>
      <VStack align="stretch" gap={sectionSpacing}>
        {m.transactional && m.endsAt && <HStack>
          <MentorshipStatusIcon m={m} />

          {/* After endsAt expires, listMentorshipsForMentee should not return
          this mentorship anymore, so we don't need to handle this case. */}

          <Text>
            此页将于{prettifyDate(m.endsAt)}失效。如需延期，请联系
            {RoleProfiles.MentorshipManager.displayName}。
          </Text>
        </HStack>}

        {!m.transactional && m.endsAt && <HStack >
          <MentorshipStatusIcon m={m} />
          <Text>一对一师生关系已于{prettifyDate(m.endsAt)}结束。</Text>
        </HStack>}
      
        {(m.mentor.id === myId || !m.transactional && !m.endsAt) && <SimpleGrid
          templateColumns={{ base: "1fr", "2xl": "1fr auto" }}
          alignItems="center"
          gap={sectionSpacing}
          my={{ base: componentSpacing, [breakpoint]: sectionSpacing }}
        >
          {m.mentor.id === myId && <GroupBar
            group={m.group}
            showJoinButton
            showGroupName={false}
          />}

          {!m.transactional && !m.endsAt && 
            <MentorshipScheduleControl mentorship={m} />}
        </SimpleGrid>}

      </VStack>
    </CardBody>
  </ResponsiveCard>;
}

function MentorshipScheduleControl({ mentorship: m }: {
  mentorship: Mentorship,
}) {
  const [editing, setEditing] = useState(false);
  const [s, setS] = useState<MentorshipSchedule | null>(m.schedule);

  return <Flex align="center" gap={1}>
    <IoMdCalendar />

    {s && <Text>
      北京时间每月{formatMentorshipSchedule(s)}
    </Text>}

    {!s && <Link onClick={() => setEditing(true)}>设置每月通话时间</Link>}

    <Link color="gray" ms={2} onClick={() => setEditing(true)}><MdEdit /></Link>

    {editing && <MentorshipScheduleEditor
      mentorship={m} 
      // Directly set the state. To properly refetch we need plumbing which I
      // am too lazy to do.
      setSchedule={setS}
      onClose={() => setEditing(false)}
    />}
  </Flex>;
}

function MentorshipScheduleEditor({ mentorship, setSchedule, onClose }: {
  mentorship: Mentorship,
  setSchedule: (s: MentorshipSchedule) => void,
  onClose: () => void,
}) {
  const old = mentorship.schedule;
  const [s, setS] = useState<MentorshipSchedule>(old ?? {
    week: 1,
    day: 1,
    hour: 10,
    minute: 0,
  });

  const [saving, setSaving] = useState(false);
  const save = async () => {
    try {
      setSaving(true);
      await trpc.mentorships.updateSchedule.mutate({
        mentorshipId: mentorship.id,
        schedule: s,
      });
      setSchedule(s);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <ModalWithBackdrop isOpen={true} onClose={onClose}>
    <ModalContent>
      <ModalHeader>每月通话时间</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <VStack align="start" gap={componentSpacing}>
          <Text>导师应与学生约定每个月固定的通话时间：</Text>

          <Wrap gap={componentSpacing} align="center" fontWeight="bold">
            <WrapItem>北京时间每月第</WrapItem>
            <WrapItem>
              <Select
                value={s.week} 
                onChange={e => setS({ ...s, week: parseInt(e.target.value) })}
              >
                {_.range(1, 5).map(week => (
                  <option key={week} value={week}>{week}</option>
                ))}
              </Select>
            </WrapItem>
            <WrapItem>个星期</WrapItem>
            <WrapItem>
              <Select
                value={s.day}
                onChange={e => setS({ ...s, day: parseInt(e.target.value) })}
              >
                {_.range(1, 8).map(day => (
                  <option key={day} value={day}>{toChineseDayOfWeek(day)}</option>
                ))}
              </Select>
            </WrapItem>
          </Wrap>

          <Wrap gap={componentSpacing} align="center" fontWeight="bold">
            <WrapItem>
              <Select
                value={s.hour}
                onChange={e => setS({ ...s, hour: parseInt(e.target.value) })}
              >
                {_.range(7, 24).map(hour => (
                  <option key={hour} value={hour}>{hour}</option>
                ))}
              </Select>
            </WrapItem>
            <WrapItem>
              <Text>时</Text>
            </WrapItem>
            <WrapItem>
              <Select
                value={s.minute}
                onChange={e => setS({ ...s, minute: parseInt(e.target.value) })}
              >
                <option value="0">00</option>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </Select>
            </WrapItem>
            <WrapItem>
              <Text>分</Text>
            </WrapItem>
          </Wrap>

          <Text mt={sectionSpacing}>每次通话时长可为一个小时左右。</Text>
        </VStack>
      </ModalBody>
      <ModalFooter>
        <Button variant="brand" onClick={save} isLoading={saving}>保存</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
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
