import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
} from '@chakra-ui/react';
import React from 'react';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import LandmarkTabPanel from 'components/map/LandmarkTabPanel';

export default function Page() {

  return (
    <TabsWithUrlParam isLazy>
      <TabList>
        <Tab>个人成长</Tab>
        <Tab>事业发展</Tab>
        <Tab>社会责任</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          <LandmarkTabPanel lat="个人成长" />
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel lat="事业发展" />
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel lat="社会责任" />
        </TabPanel>
      </TabPanels>
    </TabsWithUrlParam>
  );
}
