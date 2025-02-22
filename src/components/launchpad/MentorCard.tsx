import {
  Heading,
  CardHeader,
  CardBody, Flex
} from '@chakra-ui/react';
import { ResponsiveCard } from 'components/ResponsiveCard';
import { componentSpacing } from 'theme/metrics';
import LaunchpadCardItem from './LaunchpadCardItem';

export default function MentorCard() {
  return <ResponsiveCard>
    <CardHeader>
      <Heading size="sm">社会导师工具</Heading>
    </CardHeader>
    <CardBody>
      <Flex direction="column" gap={componentSpacing}>
        <LaunchpadCardItem 
          padding 
          title="初次交流反馈" 
          href="/match/feedback" 
        />
        <LaunchpadCardItem 
          padding
          title="常见问题与案例分析" 
          href="https://www.notion.so/yuanjian/LLM-16d36363e907802fab75f10ce1d25537"
          external
        />
      </Flex>
    </CardBody>
  </ResponsiveCard>;
}
