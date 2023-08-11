import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  WrapItem,
  Wrap,
  LinkOverlay,
  LinkBox,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Flex,
  Text,
} from '@chakra-ui/react'
import React from 'react'
import AppLayout from 'AppLayout'
import { NextPageWithLayout } from '../../NextPageWithLayout'
import { trpcNext } from "../../trpc";
import Loader from 'components/Loader';
import { formatUserName } from 'shared/strings';
import { Interview } from 'shared/Interview';
import { useUserContext } from 'UserContext';
import NextLink from "next/link";
import { Calibration } from 'shared/Calibration';
import { CheckIcon } from '@chakra-ui/icons';

const Page: NextPageWithLayout = () => {
  const { data: interviews } = trpcNext.interviews.listMine.useQuery();
  const { data: calibrations } = trpcNext.calibrations.listMine.useQuery();

  return <Flex direction='column' gap={6}>
    <Tabs isLazy>
      <TabList>
        <Tab>我的面试</Tab>
        {calibrations && calibrations.map(c => <Tab key={c.id}>
          面试讨论：{c.name}
        </Tab>)}
      </TabList>

      <TabPanels>
        <TabPanel>
          <Interviews interviews={interviews} showMe={false} />
        </TabPanel>
        {calibrations && calibrations.map(c => <TabPanel key={c.id}><Calibration calibration={c} /></TabPanel>)}
      </TabPanels>
    </Tabs>
    <Text fontSize="sm"><CheckIcon /> 表示已经填写了面试反馈的面试官。</Text>
  </Flex>;
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;
export default Page;

function Interviews({ interviews, showMe }: {
  interviews: Interview[] | undefined
  showMe: boolean
}) {
  const [me] = useUserContext();
  
  return !interviews ? <Loader /> : <TableContainer><Table>
    <Thead>
      <Tr>
        <Th>点击进入</Th><Th>{showMe ? "" : "其他"}面试官</Th>
      </Tr>
    </Thead>
    <Tbody>
    {interviews.map(i => (
      <LinkBox as={Tr} key={i.id}>
        <Td>
          <LinkOverlay as={NextLink} href={`/interviews/mine/${i.id}`}>
            {/* {i.type === "MenteeInterview" ? "学生" : "导师"}： */}
            {formatUserName(i.interviewee.name, "formal")}
          </LinkOverlay>
        </Td>
        <Td><Wrap spacing="2">
          {i.feedbacks.filter(f => showMe || f.interviewer.id !== me.id).map(f => 
            <WrapItem key={f.id}>
              {formatUserName(f.interviewer.name, "formal")}
              {f.feedbackUpdatedAt && <CheckIcon marginStart={1} />}
            </WrapItem>
          )}
        </Wrap></Td>
      </LinkBox>
    ))}
    </Tbody>
  </Table></TableContainer>;
}

function Calibration({ calibration } : {
  calibration: Calibration
}) {
  const { data: interviews } = trpcNext.calibrations.getInterviews.useQuery(calibration.id);
  
  return <Interviews interviews={interviews} showMe />;
}
