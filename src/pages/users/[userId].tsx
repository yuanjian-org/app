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
      {/* <Tab>一对一导师通话</Tab>
      <Tab>内部讨论</Tab> */}
      <Tab>申请材料</Tab>
      {/* <Tab>年度反馈</Tab> */}
    </TabList>

    <TabPanels>
      {/* <TabPanel>
        <MentorshipPanel mentorship={mentorship} />
      </TabPanel>
      <TabPanel>
        <Text color="grey" marginBottom={paragraphSpacing}>
          在此记录学生情况或者与资深导师交流。学生无法看到此页。
        </Text>
        <ChatRoom mentorshipId={mentorship.id} />
      </TabPanel> */}
      <TabPanel>
        <MenteeApplicant userId={user.id} readonly />
      </TabPanel>
      {/* <TabPanel>
        <AssessmentsTable mentorshipId={mentorship.id} />
      </TabPanel> */}
    </TabPanels>
  </TabsWithUrlParam>;
}
