import { useRouter } from 'next/router';
import { formatUserName, parseQueryStringOrUnknown } from "shared/strings";
import { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import MenteeApplicant from 'components/MenteeApplicant';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { widePage } from 'AppPage';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { MinUser } from 'shared/User';
import ChatRoom from 'components/ChatRoom';

export default widePage(() => {
  const userId = parseQueryStringOrUnknown(useRouter(), 'userId');
  const { data: u } = trpcNext.users.get.useQuery(userId);

  return !u ? <Loader /> : <>
    <PageBreadcrumb current={`${formatUserName(u.name)}`} />
    <UserTabs user={u} />
  </>;
});

function UserTabs({ user }: {
  user: MinUser,
}) {
  return <TabsWithUrlParam isLazy>
    <TabList>
      {/* <Tab>一对一导师通话</Tab> */}
      <Tab>内部笔记</Tab>
      <Tab>申请材料</Tab>
      {/* <Tab>年度反馈</Tab> */}
    </TabList>

    <TabPanels>
      {/* <TabPanel>
        <MentorshipPanel mentorship={mentorship} />
      </TabPanel> */}
      <TabPanel>
        <ChatRoom menteeId={user.id} />
      </TabPanel> 
      <TabPanel>
        <MenteeApplicant userId={user.id} />
      </TabPanel>
      {/* <TabPanel>
        <AssessmentsTable mentorshipId={mentorship.id} />
      </TabPanel> */}
    </TabPanels>
  </TabsWithUrlParam>;
}
