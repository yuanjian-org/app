import {
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Flex,
  Heading,
} from '@chakra-ui/react';
import React from 'react';
import { sectionSpacing } from 'theme/metrics';

export default function Page() {

    return (
    <Flex direction="column" gap={sectionSpacing}>
      <Tabs size = 'md'>
         <TabList>
          <Tab _selected={{ color: 'brand.c', borderBottom: '2px solid', borderColor: 'brand.c' }}>
            个人成长
          </Tab>
          <Tab _selected={{ color: 'brand.c', borderBottom: '2px solid', borderColor: 'brand.c' }}>
            事业发展
          </Tab>
          <Tab _selected={{ color: 'brand.c', borderBottom: '2px solid', borderColor: 'brand.c' }}>
            社会责任
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Heading as="h2" size="md" color="brand.c">
              个人成长
            </Heading>
          </TabPanel>
          <TabPanel>
            <Heading as="h2" size="md" color="brand.c">
              事业发展
            </Heading>
          </TabPanel>
          <TabPanel>
            <Heading as="h2" size="md" color="brand.c">
              社会责任
            </Heading>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Flex>
  );
}
