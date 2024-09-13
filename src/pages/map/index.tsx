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
  Drawer, 
  DrawerBody, 
  DrawerHeader, 
  DrawerOverlay, 
  DrawerContent, 
} from '@chakra-ui/react';
import React, { useState } from 'react';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { Landmark, Latitude  } from 'shared/Map';
import { trpcNext } from '../../trpc';
import { componentSpacing } from 'theme/metrics';
import Loader from 'components/Loader';
import { sidebarBreakpoint } from 'components/Navbars';

const desktopTextLimit = 80;
const mobileTextLimit = 30;

export default function Page() {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = (landmark: Landmark) => {
    setSelectedLandmark(landmark);
    setIsOpen(true);
  };

  const closeDrawer = () => {
    setSelectedLandmark(null);
    setIsOpen(false);
  };

  return <>
    <TabsWithUrlParam isLazy>
      <TabList>
        <Tab>个人成长</Tab>
        <Tab>事业发展</Tab>
        <Tab>社会责任</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          <LandmarkTabPanel latitude="个人成长" openDrawer={openDrawer}/>
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel latitude="事业发展" openDrawer={openDrawer}/>
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel latitude="社会责任" openDrawer={openDrawer}/>
        </TabPanel>
      </TabPanels>
    </TabsWithUrlParam>
    {<LandmarkDrawer isOpen={isOpen} onClose={closeDrawer} landmark={selectedLandmark} />}
  </>;
}

const LandmarkTabPanel = ({ latitude, openDrawer }: { 
  latitude: Latitude; openDrawer: (landmark: Landmark) => void }) => {
  const { data, isLoading } = trpcNext.map.list.useQuery(latitude);
  return (
    <>
      {isLoading ? 
        <Loader/> : 
        <SimpleGrid spacing={componentSpacing} 
        templateColumns='repeat(auto-fill, minmax(200px, 1fr))'>
          {data?.map((landmark, index) => (
            <LandmarkCard key={index} landmark={landmark} openDrawer={openDrawer}/>
          ))}
        </SimpleGrid>
      }
    </>
  );
};

const LandmarkCard = ({ landmark, openDrawer }: { 
  landmark: Landmark; openDrawer: (landmark: Landmark) => void  })  => {
  const maxChar: number = useBreakpointValue({ base: mobileTextLimit, 
    [sidebarBreakpoint]: desktopTextLimit }) || desktopTextLimit;
  const cardText = landmark.定义.length <= maxChar ? landmark.定义 : <Text>
    {landmark.定义.substring(0, maxChar)}...{' '}
    <Link onClick={ () => openDrawer(landmark) }>更多</Link>
  </Text>;  
  
  return <Card>
    <CardHeader>
      <Heading size="md">{landmark.名称}</Heading>
      </CardHeader>
      <CardBody>
        {cardText}
      </CardBody>
  </Card>; 
};

const LandmarkDrawer = ({ isOpen, onClose, landmark }: { 
  isOpen: boolean; onClose: () => void; landmark: Landmark | null }) => { 
  if (!landmark) return null;

  return <Drawer isOpen={isOpen} onClose={onClose}>
    <DrawerOverlay />
    <DrawerContent>
      <DrawerHeader>{landmark.名称}</DrawerHeader>
      <DrawerBody>
        <Text>{landmark.定义}{' '}
        <Link onClick={ () => onClose() }>收起</Link></Text>
      </DrawerBody>
    </DrawerContent>
  </Drawer>;
};
