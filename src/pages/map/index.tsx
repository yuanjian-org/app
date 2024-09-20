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
  Link,
  useBreakpointValue,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { Landmark, Latitude  } from 'shared/Map';
import { trpcNext } from '../../trpc';
import { componentSpacing } from 'theme/metrics';
import Loader from 'components/Loader';
import { sidebarBreakpoint } from 'components/Navbars';
import LandmarkDrawer from 'components/LandmarkDrawer';

const desktopTextLimit = 80;
const mobileTextLimit = 30;

export default function Page() {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  return <>
    <TabsWithUrlParam isLazy>
      <TabList>
        <Tab>个人成长</Tab>
        <Tab>事业发展</Tab>
        <Tab>社会责任</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          <LandmarkTabPanel latitude="个人成长" selectLandmark={setSelectedLandmark}/>
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel latitude="事业发展" selectLandmark={setSelectedLandmark}/>
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel latitude="社会责任" selectLandmark={setSelectedLandmark}/>
        </TabPanel>
      </TabPanels>
    </TabsWithUrlParam>
    
    {selectedLandmark && 
      <LandmarkDrawer 
        onClose={() => setSelectedLandmark(null)} 
        landmark={selectedLandmark} />}
  </>;
}

const LandmarkTabPanel = ({ latitude, selectLandmark }: { 
  latitude: Latitude; 
  selectLandmark: (landmark: Landmark) => void 
}) => {
  const { data, isLoading } = trpcNext.map.list.useQuery(latitude);
  return (
    <>
      {isLoading ? 
        <Loader/> : 
        <SimpleGrid spacing={componentSpacing} 
        templateColumns='repeat(auto-fill, minmax(200px, 1fr))'>
          {data?.map((landmark, index) => (
            <LandmarkCard 
              key={index} 
              landmark={landmark} 
              selectLandmark={selectLandmark}/>
          ))}
        </SimpleGrid>
      }
    </>
  );
};

const LandmarkCard = ({ landmark, selectLandmark }: { 
  landmark: Landmark; 
  selectLandmark: (landmark: Landmark) => void  
}) => {
  const maxChar: number = useBreakpointValue({ base: mobileTextLimit, 
    [sidebarBreakpoint]: desktopTextLimit }) || desktopTextLimit;
  const cardText = landmark.定义.length <= maxChar ? landmark.定义 : <Text>
    {landmark.定义.substring(0, maxChar)}...{' '}<Link>更多</Link>
  </Text>;  
  
  return <Card onClick={() => selectLandmark(landmark)}>
    <CardHeader>
      <Heading size="md">{landmark.名称}</Heading>
    </CardHeader>
    <CardBody>{cardText}</CardBody>
  </Card>; 
};
