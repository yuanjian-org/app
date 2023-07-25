import {
  StackDivider,
  Stack,
  Table,
  Tbody,
  Tr,
  Td,
  Select,
  TableContainer,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { NextPageWithLayout } from "../../../../NextPageWithLayout";
import AppLayout from "../../../../AppLayout";
import { trpcNext } from "../../../../trpc";
import GroupBar from '../../../../components/GroupBar';
import { Transcript } from '../../../../shared/Transcript';
import PageBreadcrumb from '../../../../components/PageBreadcrumb';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { prettifyDate, prettifyDuration } from '../../../../shared/strings';
import { parseQueryParameter } from '../../../../parseQueryParamter';
import MarkdownEditor from '../../../../components/MarkdownEditor';
import Loader from '../../../../components/Loader';

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
    <Stack>
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
      <TableContainer>
        <Table variant='striped'>
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
        </TableContainer>
      <MarkdownEditor initialValue={t.summaries[summaryIndex].summary} toolbar={false} maxHeight="600px" />;
    </Stack>
  );
}
