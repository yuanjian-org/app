import { Box, Heading, Text } from '@chakra-ui/react';
import { Landmark } from 'shared/Map';

const LandmarkCard = ({ landmark }: { landmark: Landmark })  => {
  return (
    <Box>
      <Heading size="md">{landmark.名称}</Heading>
      <Text>{landmark.定义}</Text>
    </Box>
  );
};

export default LandmarkCard;
