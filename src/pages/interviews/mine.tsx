import {
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Flex,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../../trpc";
import Calibration from 'components/Calibration';
import Interviews from 'components/Interviews';
import { sectionSpacing } from 'theme/metrics';
import TabsWithUrlParam from 'components/TabsWithUrlParam';

export default function Page() {
  const { data: interviews } = trpcNext.interviews.listMine.useQuery();
  const { data: calibrations } = trpcNext.calibrations.listMine.useQuery();

  return <Flex direction='column' gap={6}>
    <TabsWithUrlParam isLazy>
      <TabList>
        <Tab>我的面试</Tab>
        {calibrations && calibrations.map(c => <Tab key={c.id}>
          面试讨论：{c.name}
        </Tab>)}
      </TabList>

      <TabPanels>
        <TabPanel>
          <Interviews interviews={interviews} forCalibration={false} />
        </TabPanel>
        {calibrations && calibrations.map(c => 
          <TabPanel key={c.id}>
            <Calibration calibration={c} marginTop={sectionSpacing} />
          </TabPanel>
        )}
      </TabPanels>
    </TabsWithUrlParam>
  </Flex>;
};
