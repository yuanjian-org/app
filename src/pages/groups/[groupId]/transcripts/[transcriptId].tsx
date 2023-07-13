import {
  Box,
  StackDivider,
  Text,
  Stack,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  Select,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { NextPageWithLayout } from "../../../../NextPageWithLayout";
import AppLayout from "../../../../AppLayout";
import { trpcNext } from "../../../../trpc";
import GroupBar from 'components/GroupBar';
import { Transcript } from 'api/routes/transcripts';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { prettifyDate, prettifyDuration } from 'shared/strings';
import { parseQueryParameter } from '../../../../parseQueryParamter';
import MarkdownEditor from 'components/MarkdownEditor';
import Loader from 'components/Loader';

const Page: NextPageWithLayout = () => <TranscriptCard />;

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function TranscriptCard() {
  const router = useRouter();
  const id = parseQueryParameter(router, "transcriptId");
  const groupId = parseQueryParameter(router, "groupId");
  const { data: transcript } : { data: Transcript | undefined } = trpcNext.transcripts.get.useQuery({ id });

  return (<>
    <PageBreadcrumb current='摘要' parents={[
      { name: '我的会议', link: '/' },
      { name: '会议详情', link: `/groups/${groupId}` },
    ]} />
    {transcript ? <TranscriptDetail transcript={transcript} /> : <Loader />}
  </>);
}

function TranscriptDetail(props: { transcript: Transcript }) {
  return (
    <Stack divider={<StackDivider />} spacing='6'>
      <GroupBar group={props.transcript.group} showJoinButton showSelf abbreviateOnMobile={false} />
      <Summaries transcript={props.transcript} />
    </Stack>
  );
}

function Summaries(props: { transcript: Transcript }) {
  const t = props.transcript;
  invariant(t.summaries.length > 0);
  const [summaryIndex, setSummaryIndex] = useState(0);

  return (
    <Stack>
      <Table variant='striped'>
        <Thead>
          <Tr>
            <Th>日期</Th>
            <Th>时长</Th>
            <Th>摘要版本</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>{prettifyDate(t.startedAt)}</Td>
            <Td>{prettifyDuration(t.startedAt, t.endedAt)}</Td>
            <Td>
              <Select value={summaryIndex} onChange={ev => setSummaryIndex(parseInt(ev.target.value))}>
                {t.summaries.map((s, idx) => (
                  <option key={idx} value={idx}>{s.summaryKey}</option>
                ))}
              </Select>
            </Td>
          </Tr>
        </Tbody>
      </Table>
      <MarkdownEditor value={t.summaries[summaryIndex].summary} options={{
        toolbar: false,
      }}/>;
    </Stack>
  );
}
