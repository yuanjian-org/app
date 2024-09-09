import { Spinner, Stack } from '@chakra-ui/react';
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
        <Stack spacing={componentSpacing}>
          {data?.map((landmark, index) => (
            <LandmarkCard key={index} landmark={landmark} />
          ))}
        </Stack>
      )}
    </>
  );
};

export default LandmarkTabPanel;
