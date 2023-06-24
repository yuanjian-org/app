import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  StackDivider,
  Text,
  useColorModeValue,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Stack,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Icon,
} from '@chakra-ui/react';
import { ArrowForwardIcon } from '@chakra-ui/icons';
import React, { Fragment } from 'react';
import { NextPageWithLayout } from "../../NextPageWithLayout";
import AppLayout from "../../layouts";
import useUserContext from "../../useUserContext";
import tClientBrowser from "../../tClientBrowser";
import tClientNext from "../../tClientNext";
import { MdOutlineArrowCircleRight, MdVideocam } from 'react-icons/md';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetGroupResponse } from 'api/routes/groups';
import moment from 'moment';

const Page: NextPageWithLayout = () => {
  const [user] = useUserContext();
  return <Box paddingTop={'80px'}><GroupCard /></Box>
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function GroupCard() {
  const router = useRouter();
  const id = typeof router.query.id === 'string' ? router.query.id : 'nonexistence';
  const { data: group } : { data: GetGroupResponse | undefined } = tClientNext.groups.get.useQuery({ id });

  return (
    <Card>
      <CardHeader>
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href='/'>我的会议</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>会议详情</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </CardHeader>
      <CardBody>
        {group ? <GroupDetail group={group} /> : <Text align='center'>正在加载会议...</Text>}
      </CardBody>
    </Card>
  );
}

function GroupDetail(props: { group: GetGroupResponse }) {
  const group = props.group;
  const [me] = useUserContext();
  const textColor = useColorModeValue('secondaryGray.700', 'white');

  return (
    <Stack divider={<StackDivider />} spacing='10'>
      <Flex flexWrap='wrap' gap={4}>
        <Button variant='outline' leftIcon={<MdVideocam />} 
          onClick={async () => launchMeeting(group.id)}>进入会议
        </Button>
        {
          group.users
          .filter((user: any) => user.id != me.id)
          .map((user: any) => {
            return <Fragment key={user.name}>
              <Avatar name={user.name} />
              <Text color={textColor}>{user.name}</Text>
            </Fragment>;
          })
        }
      </Flex>
      <TranscriptTable group={group} />
    </Stack>
  );
}

function TranscriptTable(props: { group: GetGroupResponse }) {
  // TODO: it doesn't seem to work. https://github.com/moment/moment/blob/develop/locale/zh-cn.js
  moment.locale('zh-cn');
  return (
    <Table variant='striped'>
      <Thead>
        <Tr>
          <Th>日期</Th>
          <Th>时长</Th>
          <Th>摘要版本</Th>
          <Th>详情</Th>
        </Tr>
      </Thead>
      <Tbody>
        {props.group.transcripts.map(t => (
          <Tr key={t.transcriptId}>
            <Td><Link href='#'>{moment(t.startedAt).fromNow()}</Link></Td>
            <Td><Link href='#'>{moment.duration(moment(t.endedAt).diff(t.startedAt)).humanize()}</Link></Td>
            <Td><Link href='#'>{t.summaries.length} 个</Link></Td>
            <Td><Link href='#'>查看 <ArrowForwardIcon /></Link></Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

// TODO dedupe
async function launchMeeting(groupId: string) {
  const meetingLink = await tClientBrowser.myGroups.generateMeetingLink.mutate({ groupId: groupId });
  window.location.href = meetingLink;
}
