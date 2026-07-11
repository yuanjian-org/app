import { useRouter } from "next/router";
import { compareChinese } from "shared/strings/compareChinese";
import { formatUserName } from "shared/strings/formatUserName";
import { parseQueryString } from "shared/strings/parseQueryString";
import { prettifyDate } from "shared/strings/prettifyDate";
import { toChineseDayOfWeek } from "shared/strings/toChineseDayOfWeek";
import trpc, { trpcNext } from "trpc";
import Loader from "components/Loader";
import {
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  HStack,
  Flex,
  SimpleGrid,
  GridItem,
  Link,
  ModalHeader,
  ModalBody,
  ModalContent,
  ModalFooter,
  Button,
  ModalCloseButton,
  Select,
  VStack,
  Wrap,
  WrapItem,
  CardBody,
  Tabs,
} from "@chakra-ui/react";
import Head from "next/head";
import Applicant from "components/Applicant";
import TabsWithUrlParam from "components/TabsWithUrlParam";
import { widePage } from "AppPage";
import PageBreadcrumb from "components/PageBreadcrumb";
import User, { MinUser } from "shared/User";
import ChatRoom from "components/ChatRoom";
import {
  formatMentorshipSchedule,
  isEnded,
  Mentorship,
  MentorshipSchedule,
} from "shared/Mentorship";
import GroupBar from "components/GroupBar";
import { breakpoint } from "theme/breakpoints";
import { sectionSpacing, componentSpacing } from "theme/metrics";
import Transcripts from "components/Transcripts";
import Interview from "components/Interview";
import UserPanel from "components/UserPanel";
import { MentorshipStatusIcon } from "pages/mentees";
import { displayName, isPermitted } from "shared/Role";
import useMe, { useMyId } from "useMe";
import useMobile from "useMobile";
import { useMemo, useState } from "react";
import { MdEdit } from "react-icons/md";
import ModalWithBackdrop from "components/ModalWithBackdrop";
import _ from "lodash";
import { IoMdCalendar } from "react-icons/io";
import { ResponsiveCard } from "components/ResponsiveCard";
import TasksCard from "components/launchpad/TasksCard";
import { ExamsRequired, useExamsRequired } from "components/ExamsRequired";
import { features } from "shared/Features";
import T from "components/T";

export default widePage(() => {
  const menteeId = parseQueryString(useRouter(), "menteeId");
  const { data: mentee } = trpcNext.users.get.useQuery(menteeId ?? "", {
    enabled: !!menteeId,
  });
  const { data: mentorships } =
    trpcNext.mentorships.listMentorshipsForMentee.useQuery(
      {
        menteeId: menteeId ?? "",
        includeEndedTransactional: false,
      },
      {
        enabled: !!menteeId,
      },
    );

  const myId = useMyId();
  const { commsExamRequired, handbookExamRequired } = useExamsRequired();

  const needHandbookExam = useMemo(() => {
    if (handbookExamRequired === undefined || !mentorships) {
      return undefined;
    }
    if (!handbookExamRequired) return false;

    // Exam is needed only if the current user has relational mentorship with
    // the mentee.
    const myRelational = mentorships.filter(
      (m) => !m.transactional && m.mentor.id == myId,
    );
    if (myRelational.length == 0) return false;

    return true;
  }, [handbookExamRequired, mentorships, myId]);

  return !mentee ||
    !mentorships ||
    commsExamRequired === undefined ||
    needHandbookExam === undefined ? (
    <Loader />
  ) : commsExamRequired || needHandbookExam ? (
    <ExamsRequired
      commsExamRequired={commsExamRequired}
      handbookExamRequired={needHandbookExam}
      actionText="即可看到学生页面，开始一对一通话"
      roleText="导师"
    />
  ) : (
    <>
      <Head>
        <title>{`${formatUserName(mentee.name)} | 远图`}</title>
      </Head>
      <PageBreadcrumb current={`${formatUserName(mentee.name)}`} />
      <MenteeTabs mentee={mentee} mentorships={mentorships} />
    </>
  );
});

function MenteeTabs({
  mentee,
  mentorships,
}: {
  mentee: MinUser;
  mentorships: Mentorship[];
}) {
  const me = useMe();
  const filtered = filterAndSortMentorship(mentorships, me);

  return (
    <TabsWithUrlParam isLazy>
      <TabList>
        {filtered.length == 1 ? (
          <Tab>
            <Flex as="span" gap={1} align="center">
              <T>一对一通话</T>
              {filtered[0].mentor.id !== me.id &&
                `【${formatUserName(filtered[0].mentor.name)}】`}
              <MentorshipStatusIcon m={filtered[0]} />
            </Flex>
          </Tab>
        ) : (
          filtered.map((m) => (
            <Tab key={m.id}>
              <Flex as="span" gap={1} align="center">
                <T>一对一通话</T>
                {formatMentorshipTabSuffix(m, me.id)}
                <MentorshipStatusIcon m={m} />
              </Flex>
            </Tab>
          ))
        )}

        {features.menteeProfile && (
          <Tab>
            <T>学生自填信息</T>
          </Tab>
        )}

        {features.interviews && (
          <Tab>
            <T>申请表信息</T>
          </Tab>
        )}

        {features.interviews &&
          isPermitted(me.roles, ["Mentor", "MentorshipAdmin"]) && (
            <Tab>
              <T>面试页</T>
            </Tab>
          )}

        {/* <Tab>年度反馈</Tab> */}
      </TabList>

      <TabPanels>
        {filtered.map((m) => (
          <TabPanel key={m.id} px={0} pt={sectionSpacing}>
            <MentorshipPanel mentorship={m} />
          </TabPanel>
        ))}

        {features.menteeProfile && (
          <TabPanel>
            <MenteeProfileTabPanel menteeId={mentee.id} />
          </TabPanel>
        )}

        {features.interviews && (
          <TabPanel>
            <Applicant type="MenteeInterview" userId={mentee.id} />
          </TabPanel>
        )}

        {features.interviews &&
          isPermitted(me.roles, ["Mentor", "MentorshipAdmin"]) && (
            <InterviewTabPanel menteeId={mentee.id} />
          )}

        {/* <TabPanel>
        <AssessmentsTable mentorshipId={mentorship.id} />
      </TabPanel> */}
      </TabPanels>
    </TabsWithUrlParam>
  );
}

function MenteeProfileTabPanel({ menteeId }: { menteeId: string }) {
  const { data } = trpcNext.users.getUserProfile.useQuery(
    { userId: menteeId },
    { enabled: !!menteeId },
  );

  return data ? (
    <UserPanel data={data} showKudosControl={false} showTitle={false} />
  ) : (
    <Loader />
  );
}

function InterviewTabPanel({ menteeId }: { menteeId: string }) {
  const { data: interviewId, isLoading } =
    trpcNext.interviews.getIdForMentee.useQuery({ menteeId });
  return (
    <TabPanel>
      {isLoading ? (
        <Loader />
      ) : interviewId ? (
        <Interview interviewId={interviewId} readonly />
      ) : (
        <Text color="gray">
          <T>没有面试记录。</T>
        </Text>
      )}
    </TabPanel>
  );
}

function filterAndSortMentorship(ms: Mentorship[], me: User): Mentorship[] {
  // MentorshipOperators cannot view details such as transcripts and notes for
  // mentorships other than their own.
  if (isPermitted(me.roles, "MentorshipOperator")) {
    ms = ms.filter((m) => m.mentor.id == me.id);
  }

  const remaining = ms.filter((m) => m.mentor.id != me.id);
  const ongoingRelational = remaining
    .filter((m) => !m.transactional && !isEnded(m.endsAt))
    .sort((a, b) => compareChinese(a.mentor.name, b.mentor.name));
  const ongoingTransactional = remaining
    .filter((m) => m.transactional && !isEnded(m.endsAt))
    .sort((a, b) => compareChinese(a.mentor.name, b.mentor.name));
  const endedRelational = remaining
    .filter((m) => !m.transactional && isEnded(m.endsAt))
    .sort((a, b) => compareChinese(a.mentor.name, b.mentor.name));
  const endedTransactional = remaining
    .filter((m) => m.transactional && isEnded(m.endsAt))
    .sort((a, b) => compareChinese(a.mentor.name, b.mentor.name));

  return [
    // Always put my mentorship as the first tab
    ...ms.filter((m) => m.mentor.id == me.id),
    ...ongoingRelational,
    ...ongoingTransactional,
    ...endedRelational,
    ...endedTransactional,
  ];
}

function formatMentorshipTabSuffix(m: Mentorship, myUserId: string): string {
  return `【${m.mentor.id == myUserId ? "我" : formatUserName(m.mentor.name)}】`;
}

function MentorshipPanel({ mentorship: m }: { mentorship: Mentorship }) {
  const isMobile = useMobile();

  if (isMobile) {
    return (
      <VStack align="stretch" gap={sectionSpacing}>
        <MentorshipSummaryCard m={m} />
        <TasksCard assigneeIds={[m.mentee.id, m.mentor.id]} />
        <Tabs isLazy>
          <TabList>
            <Tab>
              <T>内部笔记</T>
            </Tab>
            <Tab>
              <T>智能会议纪要</T>
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0} pt={componentSpacing}>
              <ChatRoom menteeId={m.mentee.id} />
            </TabPanel>
            <TabPanel px={0} pt={componentSpacing}>
              <Transcripts group={m.group} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    );
  } else {
    return (
      <SimpleGrid
        templateColumns={{ base: "1fr", [breakpoint]: "1fr 1fr" }}
        spacing={sectionSpacing}
      >
        <GridItem>
          <VStack align="stretch" gap={sectionSpacing}>
            <MentorshipSummaryCard m={m} />

            <TasksCard assigneeIds={[m.mentee.id, m.mentor.id]} />

            <ChatRoom menteeId={m.mentee.id} />
          </VStack>
        </GridItem>

        <GridItem>
          <Transcripts group={m.group} />
        </GridItem>
      </SimpleGrid>
    );
  }
}

function MentorshipSummaryCard({ m }: { m: Mentorship }) {
  const myId = useMyId();

  return (
    <ResponsiveCard>
      <CardBody>
        <VStack align="stretch" gap={sectionSpacing}>
          {m.transactional && m.endsAt && (
            <HStack>
              <MentorshipStatusIcon m={m} />

              {/* After endsAt expires, listMentorshipsForMentee should not
               * return this mentorship anymore, so we don't need to handle
               * this case. */}

              <Text>
                <T>此页将于</T>
                {prettifyDate(m.endsAt)}
                <T>失效。如需延期，请联系</T>
                {displayName("MentorshipAdmin")}。
              </Text>
            </HStack>
          )}

          {!m.transactional && m.endsAt && (
            <HStack>
              <MentorshipStatusIcon m={m} />
              <Text>
                <T>一对一师生关系已于</T>
                {prettifyDate(m.endsAt)}
                <T>结束。</T>
              </Text>
            </HStack>
          )}

          {(m.mentor.id === myId || (!m.transactional && !m.endsAt)) && (
            <SimpleGrid
              templateColumns={{ base: "1fr", "2xl": "1fr auto" }}
              alignItems="center"
              gap={sectionSpacing}
              my={{ base: componentSpacing, [breakpoint]: sectionSpacing }}
            >
              {m.mentor.id === myId && (
                <GroupBar
                  group={m.group}
                  showJoinButton
                  showGroupName={false}
                />
              )}

              {!m.transactional && !m.endsAt && (
                <MentorshipScheduleControl mentorship={m} />
              )}
            </SimpleGrid>
          )}
        </VStack>
      </CardBody>
    </ResponsiveCard>
  );
}

function MentorshipScheduleControl({
  mentorship: m,
}: {
  mentorship: Mentorship;
}) {
  const [editing, setEditing] = useState(false);
  const [s, setS] = useState<MentorshipSchedule | null>(m.schedule);

  return (
    <Flex align="center" gap={1}>
      <IoMdCalendar />

      {s && (
        <Text>
          <T>北京时间每月</T>
          {formatMentorshipSchedule(s)}
        </Text>
      )}

      {!s && (
        <Link onClick={() => setEditing(true)}>
          <T>设置每月通话时间</T>
        </Link>
      )}

      <Link color="gray" ms={2} onClick={() => setEditing(true)}>
        <MdEdit />
      </Link>

      {editing && (
        <MentorshipScheduleEditor
          mentorship={m}
          // Directly set the state. To properly refetch we need plumbing
          // which I am too lazy to do.
          setSchedule={setS}
          onClose={() => setEditing(false)}
        />
      )}
    </Flex>
  );
}

function MentorshipScheduleEditor({
  mentorship,
  setSchedule,
  onClose,
}: {
  mentorship: Mentorship;
  setSchedule: (s: MentorshipSchedule) => void;
  onClose: () => void;
}) {
  const old = mentorship.schedule;
  const [s, setS] = useState<MentorshipSchedule>(
    old ?? {
      week: 1,
      day: 1,
      hour: 10,
      minute: 0,
    },
  );

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

  return (
    <ModalWithBackdrop isOpen={true} onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <T>每月通话时间</T>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="start" gap={componentSpacing}>
            <Text>
              <T>导师应与学生约定每个月固定的通话时间：</T>
            </Text>

            <Wrap gap={componentSpacing} align="center" fontWeight="bold">
              <WrapItem>
                <T>北京时间每月第</T>
              </WrapItem>
              <WrapItem>
                <Select
                  value={s.week}
                  onChange={(e) =>
                    setS({ ...s, week: parseInt(e.target.value) })
                  }
                >
                  {_.range(1, 5).map((week) => (
                    <option key={week} value={week}>
                      {week}
                    </option>
                  ))}
                </Select>
              </WrapItem>
              <WrapItem>
                <T>个星期</T>
              </WrapItem>
              <WrapItem>
                <Select
                  value={s.day}
                  onChange={(e) =>
                    setS({ ...s, day: parseInt(e.target.value) })
                  }
                >
                  {_.range(1, 8).map((day) => (
                    <option key={day} value={day}>
                      {toChineseDayOfWeek(day)}
                    </option>
                  ))}
                </Select>
              </WrapItem>
            </Wrap>

            <Wrap gap={componentSpacing} align="center" fontWeight="bold">
              <WrapItem>
                <Select
                  value={s.hour}
                  onChange={(e) =>
                    setS({ ...s, hour: parseInt(e.target.value) })
                  }
                >
                  {_.range(7, 24).map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </Select>
              </WrapItem>
              <WrapItem>
                <Text>
                  <T>时</T>
                </Text>
              </WrapItem>
              <WrapItem>
                <Select
                  value={s.minute}
                  onChange={(e) =>
                    setS({ ...s, minute: parseInt(e.target.value) })
                  }
                >
                  <option value="0">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </Select>
              </WrapItem>
              <WrapItem>
                <Text>
                  <T>分</T>
                </Text>
              </WrapItem>
            </Wrap>

            <Text mt={sectionSpacing}>
              <T>每次通话时长可为一个小时左右。</T>
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="brand" onClick={save} isLoading={saving}>
            <T>保存</T>
          </Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

// function AssessmentsTable({ mentorshipId }: {
//   mentorshipId: string,
// }) {
//   const router = useRouter();
//   const { data: assessments } =
//     trpcNext.assessments.listAllForMentorship.useQuery({ mentorshipId });

//   const createAndGo = async () => {
//     const id = await trpc.assessments.create.mutate({
//       mentorshipId: mentorshipId
//     });
//     router.push(`/mentorships/${mentorshipId}/assessments/${id}`);
//   };

//   return !assessments ? <Loader /> : !assessments.length ? (
//     <Text color="gray">无反馈内容。</Text>
//   ) : <Table>
//     <Tbody>
//       {assessments.map(a => <TrLink key={a.id}
//         href={`/mentorships/${mentorshipId}/assessments/${a.id}`}>
//         {/* Weird that Asseessment.createdAt must have optional() to suppress
//         ts's complaint */}
//         <Td>{a.createdAt && prettifyDate(a.createdAt)}</Td>
//         <Td>{a.summary ?? ""}</Td>
//       </TrLink>)}
//     </Tbody>
//   </Table>;
// }

import getI18nProps from "components/getI18nProps";
export const getServerSideProps = getI18nProps;
