import { Tab, TabList, TabPanel, TabPanels, SimpleGrid, Heading, Text, Card, CardHeader, CardBody, Link, useBreakpointValue } from '@chakra-ui/react';
import React, { useState } from 'react';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { Landmark, Latitude } from 'shared/Map';
import { breakpoint, componentSpacing } from 'theme/metrics';
import LandmarkDrawer from 'components/LandmarkDrawer';


const desktopTextLimit = 80;
const mobileTextLimit = 30;

export default function Map( { data } : {data: Record<string, Landmark[]>}) {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  return <>
    <TabsWithUrlParam isLazy>
      <TabList>
        {Object.keys(data).map(latitude => <Tab key={latitude}>{latitude}</Tab>)}
      </TabList>

      <TabPanels>
        {Object.keys(data).map(latitude =>
            <TabPanel key={latitude}>
              <LandmarkTabPanel landmarks={data[latitude as Latitude]} selectLandmark={setSelectedLandmark} />
            </TabPanel>
        )}
      </TabPanels>
    </TabsWithUrlParam>

    {selectedLandmark &&
        <LandmarkDrawer onClose={() => setSelectedLandmark(null)} landmark={selectedLandmark} />}
  </>;
}

const LandmarkTabPanel = ({ landmarks, selectLandmark }: {
  landmarks: Landmark[];
  selectLandmark: (landmark: Landmark) => void
}) => {
  return <SimpleGrid spacing={componentSpacing}
    templateColumns='repeat(auto-fill, minmax(200px, 1fr))'>
      {landmarks.map((landmark, index) =>
        <LandmarkCard key={index} landmark={landmark} selectLandmark={selectLandmark} />)}
  </SimpleGrid>;
};

const LandmarkCard = ({ landmark, selectLandmark }: {
  landmark: Landmark;
  selectLandmark: (landmark: Landmark) => void
}) => {
  const maxChar: number = useBreakpointValue({ base: mobileTextLimit,
    [breakpoint]: desktopTextLimit }) || desktopTextLimit;
  const cardText = landmark.定义.length <= maxChar ? landmark.定义 : <Text>
    {landmark.定义.substring(0, maxChar)}...{' '}<Link>更多</Link>
  </Text>;

  return <Card onClick={() => selectLandmark(landmark)} cursor='pointer'>
    <CardHeader>
      <Heading size="md">{landmark.名称}</Heading>
    </CardHeader>
    <CardBody>{cardText}</CardBody>
  </Card>;
};
