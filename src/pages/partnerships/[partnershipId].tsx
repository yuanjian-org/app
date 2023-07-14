import AppLayout from 'AppLayout';
import { NextPageWithLayout } from '../../NextPageWithLayout';
import { useRouter } from 'next/router';
import { parseQueryParameter } from 'parseQueryParamter';
import { trpcNext } from 'trpc';
import PageBreadcrumb, { pageBreadcrumbMarginBottom } from 'components/PageBreadcrumb';
import Loader from 'components/Loader';
import { Flex, Grid, GridItem, HStack, Heading, Text, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import { JoinButton } from 'components/GroupBar';
import { sidebarBreakpoint } from 'components/Navbars';
import MarkdownEditor from 'components/MarkdownEditor';
import AssessmentsPanel from 'components/AssessmentsPanel';
import { Partnership } from 'shared/Partnership';

const Page: NextPageWithLayout = () => {
  const { data: partnership } = trpcNext.partnerships.getWithAssessments.useQuery(
    parseQueryParameter(useRouter(), 'partnershipId')
  );
  if (!partnership) return <Loader />

  return <>
    <HStack spacing={10} marginBottom={pageBreadcrumbMarginBottom}>
      <PageBreadcrumb current={`我的朋友${partnership.mentee.name}`} marginBottom={0} />
      <JoinButton isDisabled>开始通话</JoinButton>
    </HStack>
    <Grid templateColumns={{ base: "1fr", [sidebarBreakpoint]: "0.382fr 0.618fr" }} gap={10}>
      <GridItem>
        <PrivateNotes />
      </GridItem>
      <GridItem>
        <MenteeTabs partnership={partnership} />
      </GridItem>
    </Grid>
  </>;
};

Page.getLayout = (page) => <AppLayout unlimitedPageWidth>{page}</AppLayout>;

export default Page;

const Head = ({ children }: any) => <Text>{children}</Text>;

function PrivateNotes() {
  return <Flex direction="column" gap={6}>
    <Head>私人备忘录</Head>
    <MarkdownEditor value="可记录未来通话主题等任意数据（尚未实现保存）" />
  </Flex>;
}

type PartnershipProps = {
  partnership: Partnership,
};

function MenteeTabs({ partnership } : PartnershipProps) {
  return <Tabs isFitted isLazy index={3}>
    <TabList>
      <Tab isDisabled><Head>通话摘要</Head></Tab>
      <Tab isDisabled><Head>基本资料</Head></Tab>
      <Tab isDisabled><Head>面试材料</Head></Tab>
      <Tab><Head>评估辅助</Head></Tab>
    </TabList>

    <TabPanels>
      <TabPanel>
        TODO
      </TabPanel>
      <TabPanel>
        TODO
      </TabPanel>
      <TabPanel>
        TODO
      </TabPanel>
      <TabPanel>
        <AssessmentTabPanel partnership={partnership} />
      </TabPanel>
    </TabPanels>
  </Tabs>;
}

function AssessmentTabPanel({ partnership } : PartnershipProps) {
  const { data: assessments } = trpcNext.assessments.listAllOfPartneship.useQuery(partnership.id);
  // @ts-ignore so weird
  return <AssessmentsPanel partnership={partnership} assessments={assessments} />;
}
