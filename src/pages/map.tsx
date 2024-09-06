import {
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Heading,
  Stack,
  Box,
  Text,
  Spinner,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { trpcNext } from "../trpc";
import { Landmark } from 'shared/Map';

export default function Page() {
  const [tabIndex, setTabIndex] = useState(0);

  const personalGrowth = trpcNext.map.list.useQuery('个人成长', { enabled: tabIndex === 0 });
  const careerDevelopment = trpcNext.map.list.useQuery('事业发展', { enabled: tabIndex === 1 });
  const socialResponsibility = trpcNext.map.list.useQuery('社会责任', { enabled: tabIndex === 2 });

  const ChakraCards = ({ data }: { data: Landmark[] | undefined }) => {
    return (
      <Stack spacing={4}>
        {data?.map((landmark: Landmark, index: React.Key | null | undefined) => (
          <Box key={index}>   
            <Heading size="md">{landmark.名称}</Heading>
            <Text>{landmark.定义}</Text>  
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <Tabs size="md" onChange={(index) => setTabIndex(index)}>
      <TabList>
        <Tab>个人成长</Tab>
        <Tab>事业发展</Tab>
        <Tab>社会责任</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          {personalGrowth.isLoading ? (
            <Spinner />
          ) : (
            <ChakraCards data={personalGrowth.data} />
          )}
        </TabPanel>

        <TabPanel>
          {careerDevelopment.isLoading ? (
            <Spinner />
          ) : (
            <ChakraCards data={careerDevelopment.data} />
          )}
        </TabPanel>

        <TabPanel>
          {socialResponsibility.isLoading ? (
            <Spinner />
          ) : (
            <ChakraCards data={socialResponsibility.data} />
          )}
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
