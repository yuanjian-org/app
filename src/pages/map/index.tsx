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
import { Landmark } from 'shared/Map';
import { componentSpacing } from 'theme/metrics';
import Loader from 'components/Loader';
import { sidebarBreakpoint } from 'components/Navbars';
import LandmarkDrawer from 'components/LandmarkDrawer';
import path from 'path';
import fs from 'fs';
import { InferGetStaticPropsType } from "next";

const desktopTextLimit = 80;
const mobileTextLimit = 30;

type PageProps = InferGetStaticPropsType<typeof getStaticProps>;

export default function Page({ data }: PageProps) {
  const [selectedLandmark, setSelectedLandmark] = useState<Landmark | null>(null);

  if (!data) {
    return <>data is undefined</>;
  }

  return <>
    <TabsWithUrlParam isLazy>
      <TabList>
        <Tab>个人成长</Tab>
        <Tab>事业发展</Tab>
        <Tab>社会责任</Tab>
      </TabList>

      <TabPanels>
        <TabPanel>
          <LandmarkTabPanel landmarks={data[0]} selectLandmark={setSelectedLandmark}/>
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel landmarks={data[1]} selectLandmark={setSelectedLandmark}/>
        </TabPanel>

        <TabPanel>
          <LandmarkTabPanel landmarks={data[2]} selectLandmark={setSelectedLandmark}/>
        </TabPanel>
      </TabPanels>
    </TabsWithUrlParam>
    
    {selectedLandmark && 
      <LandmarkDrawer 
        onClose={() => setSelectedLandmark(null)} 
        landmark={selectedLandmark} />}
  </>;
}

const LandmarkTabPanel = ({ landmarks, selectLandmark }: { 
  landmarks: Landmark[];
  selectLandmark: (landmark: Landmark) => void 
}) => {
  return (
    <>
      {landmarks.length === 0? 
        <Loader/> : 
        <SimpleGrid spacing={componentSpacing} 
        templateColumns='repeat(auto-fill, minmax(200px, 1fr))'>
          {landmarks.map((landmark, index) => (
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
  
  return <Card onClick={() => selectLandmark(landmark)} cursor='pointer'>
    <CardHeader>
      <Heading size="md">{landmark.名称}</Heading>
    </CardHeader>
    <CardBody>{cardText}</CardBody>
  </Card>; 
};

export async function getStaticProps(){
  const latitudes = ['个人成长', '事业发展', '社会责任'];

  const data = await Promise.all(
    latitudes.map(async (latitude) => {
      const landmarkDataPath = path.join(process.cwd(), 'public', 'map', latitude);
      const files = await fs.promises.readdir(landmarkDataPath);

      return Promise.all(
        files
          .filter(file => path.extname(file) === '.json')
          .map(async file => {
            const filePath = path.join(landmarkDataPath, file);
            const fileContent = await fs.promises.readFile(filePath, 'utf8');
            const landmark = JSON.parse(fileContent);
            return {
              ...landmark,
              名称: path.basename(file, '.json'),
            };
          })
      );
    })
  );

  console.log(data.length, typeof data, Array.isArray(data), data[2], typeof data[2], data[2][1]["定义"]);
  return { props: { data } };
}
