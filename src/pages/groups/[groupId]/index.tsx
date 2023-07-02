import {
  Box,
  Card,
  CardBody,
  CardHeader,
  StackDivider,
  Text,
  Stack,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Center,
} from '@chakra-ui/react';
import { ArrowForwardIcon } from '@chakra-ui/icons';
import React from 'react';
import { NextPageWithLayout } from "../../../NextPageWithLayout";
import AppLayout from "../../../AppLayout";
import useUserContext from "../../../useUserContext";
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GetGroupResponse } from 'api/routes/groups';
import moment from 'moment';
import GroupBar from 'components/GroupBar';
import trpcNext from 'trpcNext';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { capitalizeFirstChar } from 'shared/utils/string';

const Page: NextPageWithLayout = () => {
  const [user] = useUserContext();
  return <Box paddingTop={'80px'}><GroupCard /></Box>
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function GroupCard() {
  const router = useRouter();
  const id = typeof router.query.groupId === 'string' ? router.query.groupId : 'nonexistence';
  const { data: group } : { data: GetGroupResponse | undefined } = trpcNext.groups.get.useQuery({ id });

  return (
    <Card>
      <CardHeader>
        <PageBreadcrumb current='会议详情' parents={[{ name: '我的会议', link: '/' }]} />
      </CardHeader>
      <CardBody>
        {group ? <GroupDetail group={group} /> : <Text align='center'>正在加载...</Text>}
      </CardBody>
    </Card>
  );
}

function GroupDetail(props: { group: GetGroupResponse }) {
  return (
    <Stack divider={<StackDivider />} spacing='6'>
      <GroupBar group={props.group} showJoinButton />
      <TranscriptTable group={props.group} />
    </Stack>
  );
}

function TranscriptTable(props: { group: GetGroupResponse }) {
  // TODO: it doesn't seem to work. https://github.com/moment/moment/blob/develop/locale/zh-cn.js
  moment.locale('zh-cn');
  return (
    <>
      <Table variant='striped'>
        <Thead>
          <Tr>
            <Th>会议时间</Th>
            <Th>时长</Th>
            <Th>摘要</Th>
          </Tr>
        </Thead>
        <Tbody>
          {props.group.transcripts.map(t => {
            const link = `/groups/${props.group.id}/transcripts/${t.transcriptId}`;
            return <Tr key={t.transcriptId}>
              <Td><Link href={link}>{capitalizeFirstChar(moment(t.startedAt).fromNow())}</Link></Td>
              <Td><Link href={link}>{capitalizeFirstChar(moment.duration(moment(t.endedAt).diff(t.startedAt)).humanize())}</Link></Td>
              <Td><Link href={link}>{t.summaries.length} 版摘要 <ArrowForwardIcon /></Link></Td>
            </Tr>;
          })}
        </Tbody>
      </Table>
      {!props.group.transcripts.length && <Center margin={10} color='gray.400'>无会议历史</Center>}
    </>
  );
}
