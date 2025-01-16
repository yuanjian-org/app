import {
  Heading,
  CardHeader,
  CardBody,
  Text,
} from '@chakra-ui/react';
import { ResponsiveCard } from 'components/Card';

export default function NewsGadget() {
  return <ResponsiveCard>
    <CardHeader>
      <Heading size="sm">消息通知</Heading>
    </CardHeader>
    <CardBody>
      <Text color="gray">
        🌙 岁月悠悠，静候佳音。
      </Text>
    </CardBody>
  </ResponsiveCard>;
}
