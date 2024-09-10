import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  SimpleGrid,
  Heading, 
  Text,
  Card,
  CardHeader,
  CardBody,
} from '@chakra-ui/react';
import React from 'react';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { Landmark, Latitude  } from 'shared/Map';
import { trpcNext } from '../../trpc';
import { componentSpacing } from 'theme/metrics';
import Loader from 'components/Loader';

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
          <LandmarkTabPanel latitude="个人成长" />
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel latitude="事业发展" />
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel latitude="社会责任" />
        </TabPanel>
      </TabPanels>
    </TabsWithUrlParam>
  );
}

const LandmarkTabPanel = ({ latitude }: { latitude: Latitude }) => {
  const { data, isLoading } = trpcNext.map.list.useQuery(latitude);

  return (
    <>
      {isLoading ? 
        <Loader/> : 
        <SimpleGrid spacing={componentSpacing} 
        templateColumns='repeat(auto-fill, minmax(200px, 1fr))'>
          {data?.map((landmark, index) => (
            <LandmarkCard key={index} landmark={landmark} />
          ))}
        </SimpleGrid>
      }
    </>
  );
};

const LandmarkCard = ({ landmark }: { landmark: Landmark })  => {
  return (
    <Card>
      <CardHeader>
        <Heading size="md">{landmark.名称}</Heading>
      </CardHeader>
      <CardBody>
        <Text>{landmark.定义}</Text>
      </CardBody>
    </Card>
  );
};
