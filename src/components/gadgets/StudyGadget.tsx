import {
  Heading,
  CardHeader,
  CardBody,
  Text,
  Link, Flex
} from '@chakra-ui/react';
import { ResponsiveCard } from 'components/Card';
import NextLink from 'next/link';
import { IoMdBookmark } from 'react-icons/io';
import colors from 'theme/colors';

export default function StudyGadget() {
  return <ResponsiveCard>
    <CardHeader>
      <Heading size="sm">志愿者学习材料</Heading>
    </CardHeader>
    <CardBody>
      <Flex direction="column" gap={2}>
        <StudyItem title="《学生通讯原则》" href="/study/comms" />
        <StudyItem title="《社会导师手册》" href="/study/handbook" />
        <StudyItem title="《招生流程》与《面试标准》" href="/study/interview" />
      </Flex>
    </CardBody>
  </ResponsiveCard>;
}

function StudyItem({ title, href }: { title: string, href: string }) {
  return <Text display="inline-flex" alignItems="center">
    <IoMdBookmark color={colors.brand["100"]} />
    <Link as={NextLink} href={href}>
      {title}
    </Link>
  </Text>;
}
