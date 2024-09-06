import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Heading,
  Stack,
  Box,
  Text,
  Spinner,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../trpc";
import { Landmark } from 'shared/Map';
import TabsWithUrlParam from 'components/TabsWithUrlParam';

export default function Page() {
  const personalGrowth = trpcNext.map.list.useQuery('个人成长');
  const careerDevelopment = trpcNext.map.list.useQuery('事业发展');
  const socialResponsibility = trpcNext.map.list.useQuery('社会责任');

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
    <TabsWithUrlParam isLazy>
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
    </TabsWithUrlParam>
  );
}
