import { Box, Heading, Text } from '@chakra-ui/react';
import { Landmark } from 'shared/Map'; // Import your Landmark type

interface LandmarkCardProps {
  landmark: Landmark;
}

const LandmarkCard: React.FC<LandmarkCardProps> = ({ landmark }) => {
  return (
    <Box>
      <Heading size="md">{landmark.名称}</Heading>
      <Text>{landmark.定义}</Text>
    </Box>
  );
};

export default LandmarkCard;
