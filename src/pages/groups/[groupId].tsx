import {
  StackDivider,
  Stack,
  Table,
  Tbody,
  Td,
  Center,
  Icon,
  Heading,
  TableContainer,
} from '@chakra-ui/react';
import React from 'react';
import { NextPageWithLayout } from "../../NextPageWithLayout";
import AppLayout from "../../AppLayout";
import { useRouter } from 'next/router';
import { GroupWithTranscripts } from '../../shared/Group';
import GroupBar from 'components/GroupBar';
import { trpcNext } from "../../trpc";
import PageBreadcrumb from 'components/PageBreadcrumb';
import { prettifyDate, prettifyDuration } from 'shared/strings';
import Loader from 'components/Loader';
import { MdChevronRight } from 'react-icons/md';
import { parseQueryParameter } from '../../parseQueryParamter';
import TrLink from 'components/TrLink';

const Page: NextPageWithLayout = () => <GroupCard />;

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function GroupCard() {
  const id = parseQueryParameter(useRouter(), "groupId");
  const { data: group } : { data: GroupWithTranscripts | undefined } = trpcNext.groups.get.useQuery({ id });

  return (<>
    <PageBreadcrumb current='会议详情' parents={[{ name: '我的会议', link: '/' }]} />
    {group ? <GroupDetail group={group} /> : <Loader />}
  </>);
}

function GroupDetail(props: { group: GroupWithTranscripts }) {
  return (
    <Stack divider={<StackDivider />} spacing={6}>
      <GroupBar group={props.group} showJoinButton showSelf abbreviateOnMobile={false} />
      <TranscriptTable group={props.group} />
    </Stack>
  );
}

function TranscriptTable(props: { group: GroupWithTranscripts }) {
  return (
    <>
      <Heading size="sm" marginBottom={3}>会议历史</Heading>
      <TableContainer>
        <Table>
          <Tbody>
            {props.group.transcripts.map(t => {
              return <TrLink key={t.transcriptId} href={`/groups/${props.group.id}/transcripts/${t.transcriptId}`}>
                <Td>{prettifyDate(t.startedAt)}</Td>
                <Td>{prettifyDuration(t.startedAt, t.endedAt)}</Td>
                <Td>{t.summaries.length} 版摘要 <Icon as={MdChevronRight} /></Td>
              </TrLink>;
            })}
          </Tbody>
        </Table>
      </TableContainer>
      {!props.group.transcripts.length && <Center margin={10} color='gray'>
        无会议历史。（会议结束后一小时之内会显示在这里。）
      </Center>}
    </>
  );
}
