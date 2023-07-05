import {
  StackDivider,
  Stack,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Center,
  Icon,
} from '@chakra-ui/react';
import React from 'react';
import { NextPageWithLayout } from "../../NextPageWithLayout";
import AppLayout from "../../AppLayout";
import { useRouter } from 'next/router';
import Link from 'next/link';
import { GroupWithTranscripts } from 'api/routes/groups';
import moment from 'moment';
import GroupBar from 'components/GroupBar';
import trpcNext from 'trpcNext';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { capitalizeFirstChar } from 'shared/string';
import Loader from 'components/Loader';
import { MdChevronRight } from 'react-icons/md';

const Page: NextPageWithLayout = () => <GroupCard />;

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function GroupCard() {
  const router = useRouter();
  const id = typeof router.query.groupId === 'string' ? router.query.groupId : 'nonexistence';
  const { data: group } : { data: GroupWithTranscripts | undefined } = trpcNext.groups.get.useQuery({ id });

  return (<>
    <PageBreadcrumb current='会议详情' parents={[{ name: '我的会议', link: '/' }]} />
    {group ? <GroupDetail group={group} /> : <Loader />}
  </>);
}

function GroupDetail(props: { group: GroupWithTranscripts }) {
  return (
    <Stack divider={<StackDivider />} spacing='6'>
      <GroupBar group={props.group} showJoinButton showSelf abbreviateOnMobile={false} />
      <TranscriptTable group={props.group} />
    </Stack>
  );
}

function TranscriptTable(props: { group: GroupWithTranscripts }) {
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
              <Td><Link href={link}>{t.summaries.length} 版摘要 <Icon as={MdChevronRight} /></Link></Td>
            </Tr>;
          })}
        </Tbody>
      </Table>
      {!props.group.transcripts.length && <Center margin={10} color='gray'>无会议历史。（由于技术限制，历史会议在24小时之后才能显示在这里。我们之后会解决这个限制。）</Center>}
    </>
  );
}
