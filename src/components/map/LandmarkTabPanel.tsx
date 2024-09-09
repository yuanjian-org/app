import { Spinner, SimpleGrid } from '@chakra-ui/react';
import { trpcNext } from '../../trpc';
import LandmarkCard from './LandmarkCard';
import { componentSpacing } from 'theme/metrics';
import { Latitude } from 'shared/Map';

const LandmarkTabPanel = ({ lat }: { lat: Latitude }) => {
  const { data, isLoading } = trpcNext.map.list.useQuery(lat);

  return (
    <>
      {isLoading ? (
        <Spinner />
      ) : (
        <SimpleGrid spacing={componentSpacing} templateColumns='repeat(auto-fill, minmax(200px, 1fr))'>
          {data?.map((landmark, index) => (
            <LandmarkCard key={index} landmark={landmark} />
          ))}
        </SimpleGrid>
      )}
    </>
  );
};

export default LandmarkTabPanel;
