import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem, Text, TabList, TabPanels, Tab, TabPanel, Tooltip } from '@chakra-ui/react';
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

const Page: NextPageWithLayout = () => {
  const partnershipId = parseQueryParameter(useRouter(), 'partnershipId');
  const { data: partnership } = trpcNext.partnerships.get.useQuery(partnershipId);
  if (!partnership) return <Loader />

  return <>
    <MobileExperienceAlert marginBottom={paragraphSpacing} />
    <GroupBar group={partnership.group} showJoinButton showGroupName={false} marginBottom={sectionSpacing + 2}
      showTranscriptCount showTranscriptLink
    />
    <Grid gap={10} templateColumns={{ 
      base: "1fr", 
      [sidebarBreakpoint]: "2fr 1fr", // "0.618fr 0.382fr",
    }}>
      <GridItem>
        <MenteeTabs partnershipId={partnershipId} menteeId={partnership.mentee.id} />
      </GridItem>
      <GridItem>
        <PrivateNotes 
          partnershipId={partnershipId}
          loading={partnership == null}
          notes={partnership?.privateMentorNotes} />
      </GridItem>
    </Grid>
  </>;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;

function PrivateNotes({ partnershipId, notes, loading }: { 
  partnershipId: string,
  notes: PrivateMentorNotes | null,
  loading: boolean,
}) {

  const save = async (editedMemo: string) => {
    await trpc.partnerships.update.mutate({ 
      id: partnershipId, 
      privateMentorNotes: { memo: editedMemo },
    });
  };

  return <Flex direction="column" gap={6}>
    <Flex alignItems="center">
      <b>导师笔记</b>
      <Tooltip label="学生无法看到笔记内容。详见《谁能看到我的数据》页。">
        <QuestionIcon color="gray" marginStart={2} />
      </Tooltip>
    </Flex>
    {loading ? <Loader /> : 
      <AutosavingMarkdownEditor key={partnershipId} initialValue={notes?.memo || ''} onSave={save} />}
  </Flex>;
}

function MenteeTabs({ partnershipId, menteeId }: {
  partnershipId: string,
  menteeId: string,
}) {

  const TabHead = ({ children }: any) => <Text>{children}</Text>;

  return <TabsWithUrlParam isFitted isLazy>
    <TabList>
      <Tab><TabHead>申请材料</TabHead></Tab>
      <Tab isDisabled><TabHead>通话摘要</TabHead></Tab>
      <Tab isDisabled><TabHead>面试反馈</TabHead></Tab>
      <Tab><TabHead>评估辅助</TabHead></Tab>
    </TabList>

    <TabPanels>
      <TabPanel>
        <MenteeApplicant userId={menteeId} readonly />
      </TabPanel>
      <TabPanel>
        TODO
      </TabPanel>
      <TabPanel>
        TODO
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
  const { data: assessments } = trpcNext.assessments.listAllOfPartneship.useQuery(partnershipId);
  // @ts-ignore so weird
  return <AssessmentsPanel partnershipId={partnershipId} assessments={assessments} />;
}
