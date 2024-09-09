import {
  Heading, 
  Text,
  Card,
  CardHeader,
  CardBody,
} from '@chakra-ui/react';
import { Landmark } from 'shared/Map';

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

export default LandmarkCard;
