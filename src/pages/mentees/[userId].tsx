import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  formatUserName,
  parseQueryStringOrUnknown,
  prettifyDate,
} from 'shared/strings';
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stack,
  Text,
  HStack,
  Tabs,
} from '@chakra-ui/react';
import MenteeApplicant from 'components/MenteeApplicant';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { widePage } from 'AppPage';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { MinUser } from 'shared/User';
import ChatRoom from 'components/ChatRoom';
import { Mentorship } from 'shared/Mentorship';
import { useUserContext } from 'UserContext';
import GroupBar from 'components/GroupBar';
import { sectionSpacing } from 'theme/metrics';
import Transcripts from 'components/Transcripts';
import { PiFlagCheckeredFill } from 'react-icons/pi';
import replaceUrlParam from 'shared/replaceUrlParam';

export default widePage(() => {
  const userId = parseQueryStringOrUnknown(useRouter(), "userId");
  const { data: u } = trpcNext.users.get.useQuery(userId);
  const { data: mentorships } =
    trpcNext.mentorships.listForMentee.useQuery(userId);

  return !u ? (
    <Loader />
  ) : (
    <>
      <PageBreadcrumb current={`${formatUserName(u.name)}`} />
      <MenteeTabs user={u} mentorships={mentorships || []} />
    </>
  );
});

function MenteeTabs({
  user,
  mentorships,
}: {
  user: MinUser;
  mentorships: Mentorship[];
}) {
  const [me] = useUserContext();
  const sortedMentorships = sortMentorship(mentorships, me.id);
  const [saved, setSaved] = useState<boolean>(false);
  const router = useRouter();
  const index = parseInt(
    typeof router.query.tab == "string" ? router.query.tab : "0"
  );
  const [tabIndex, setTabIndex] = useState(index);

  const tabsChangeConfirm = (): boolean => {
    const warningText = "数据未保存。确定离开当前页面？";
    return window.confirm(warningText);
  };

  const handleTabsChange = (idx: number) => {
    if (saved) {
      if (idx !== 0) {
        if (tabsChangeConfirm()) {
          setTabIndex(idx);
          setSaved(false);
        } else {
          setTabIndex(0);
        }
      }
    } else {
      setTabIndex(idx);
    }
  };

  return (
    <>
      {saved && <LeavePagePrompt />}
      <Tabs
        isLazy
        lazyBehavior="unmount"
        isManual
        index={tabIndex}
        onChange={handleTabsChange}
      >
        <TabList>
          {sortedMentorships.length == 1 ? (
            <Tab>
              一对一通话
              {sortedMentorships[0].mentor.id !== me.id &&
                `【${formatUserName(sortedMentorships[0].mentor.name)}】`}
            </Tab>
          ) : (
            sortedMentorships.map((m) => (
              <Tab key={m.id}>
                一对一通话{formatMentorshipTabSuffix(m, me.id)}
              </Tab>
            ))
          )}
          <Tab>内部笔记</Tab>
          <Tab>申请材料</Tab>
          {/* <Tab>年度反馈</Tab> */}
        </TabList>

        <TabPanels>
          {sortedMentorships.map((m) => (
            <TabPanel key={m.id}>
              <MentorshipPanel mentorship={m} />
            </TabPanel>
          ))}
          <TabPanel>
            <ChatRoom
              menteeId={user.id}
              savedChanged={(type) => {
                console.log(type, 33333);
                setSaved(type);
              }}
            />
          </TabPanel>
          <TabPanel>
            <MenteeApplicant userId={user.id} />
          </TabPanel>
          {/* <TabPanel>
        <AssessmentsTable mentorshipId={mentorship.id} />
      </TabPanel> */}
        </TabPanels>
      </Tabs>
    </>
  );
}

function sortMentorship(ms: Mentorship[], myUserId: string): Mentorship[] {
  return [
    // Always put my mentorship as the first tab
    ...ms.filter((m) => m.mentor.id == myUserId),
    // Then sort by ids
    ...ms
      .filter((m) => m.mentor.id != myUserId)
      .sort((a, b) => a.id.localeCompare(b.id)),
  ];
}

function formatMentorshipTabSuffix(m: Mentorship, myUserId: string): string {
  return `【${
    m.mentor.id == myUserId ? "我" : formatUserName(m.mentor.name)
  }】`;
}

function MentorshipPanel({ mentorship: m }: { mentorship: Mentorship }) {
  const [me] = useUserContext();

  return (
    <Stack spacing={sectionSpacing} marginTop={sectionSpacing}>
      {m.endedAt && (
        <HStack>
          <PiFlagCheckeredFill />
          <Text>{formatMentorshipEndedAtText(m.endedAt)}。</Text>
        </HStack>
      )}

      {m.mentor.id === me.id && (
        <GroupBar group={m.group} showJoinButton showGroupName={false} />
      )}

      <Transcripts groupId={m.group.id} />
    </Stack>
  );
}

export function formatMentorshipEndedAtText(endedAt: string): string {
  return `一对一师生关系已结束（${prettifyDate(endedAt)}）`;
}

export function LeavePagePrompt() {
  const router = useRouter();
  useEffect(() => {
    const warningText = "数据未保存。确定离开当前页面？";
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = warningText);
    };
    const handleBrowseAway = () => {
      if (window.confirm(warningText)) return;
      router.events.emit("routeChangeError");
      throw "routeChange aborted.";
    };
    window.addEventListener("beforeunload", handleWindowClose);
    router.events.on("routeChangeStart", handleBrowseAway);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      router.events.off("routeChangeStart", handleBrowseAway);
    };
  }, [router]);

  return null;
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

//   return !assessments ? <Loader /> : !assessments.length ? <Text color="grey">无反馈内容。</Text> : <Table>
//     <Tbody>
//       {assessments.map(a => <TrLink key={a.id} href={`/mentorships/${mentorshipId}/assessments/${a.id}`}>
//         {/* Weird that Asseessment.createdAt must have optional() to suppress ts's complaint */}
//         <Td>{a.createdAt && prettifyDate(a.createdAt)}</Td>
//         <Td>{a.summary ?? ""}</Td>
//       </TrLink>)}
//     </Tbody>
//   </Table>;
// }
