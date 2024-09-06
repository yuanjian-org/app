import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Stack,
  Spinner,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../trpc";
import { Landmark } from 'shared/Map';
import LandmarkCard from 'components/LandMarkCard';
import TabsWithUrlParam from 'components/TabsWithUrlParam';
import { componentSpacing } from 'theme/metrics';

export default function Page() {
  const personalGrowth = trpcNext.map.list.useQuery('个人成长');
  const careerDevelopment = trpcNext.map.list.useQuery('事业发展');
  const socialResponsibility = trpcNext.map.list.useQuery('社会责任');

  const LandmarkCardList = ({ data }: { data: Landmark[] | undefined }) => {
    return (
      <Stack spacing={componentSpacing}>
        {data?.map((landmark: Landmark, index: React.Key | null | undefined) => (
        <LandmarkCard key={index} landmark={landmark} />
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
          {personalGrowth.isLoading ? 
            <Spinner /> : <LandmarkCardList data={personalGrowth.data} />
          }
        </TabPanel>

        <TabPanel>
          {careerDevelopment.isLoading ?
            <Spinner /> : <LandmarkCardList data={careerDevelopment.data} />
          }
        </TabPanel>

        <TabPanel>
          {socialResponsibility.isLoading ? 
            <Spinner /> : <LandmarkCardList data={socialResponsibility.data} />
          }
        </TabPanel>
      </TabPanels>
    </TabsWithUrlParam>
  );
}
