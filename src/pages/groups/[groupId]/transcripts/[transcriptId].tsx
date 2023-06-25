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
  Select,
  Textarea,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { NextPageWithLayout } from "../../../../NextPageWithLayout";
import AppLayout from "../../../../layouts";
import useUserContext from "../../../../useUserContext";
import tClientNext from "../../../../tClientNext";
import moment from 'moment';
import GroupBanner from 'components/GroupBanner';
import { GetTranscriptResponse } from 'api/routes/transcripts';
import MeetingBreadcrumb from 'components/MeetingBreadcrumb';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { capitalizeFirstChar } from 'shared/utils/string';

const Page: NextPageWithLayout = () => {
  const [user] = useUserContext();
  return <Box paddingTop={'80px'}><TranscriptCard /></Box>
}

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function TranscriptCard() {
  const router = useRouter();
  const id = typeof router.query.transcriptId === 'string' ? router.query.transcriptId : 'nonexistence';
  const { data: transcript } : { data: GetTranscriptResponse | undefined } = tClientNext.transcripts.get.useQuery({ id });

  return (
    <Card>
      <CardHeader>
        <MeetingBreadcrumb current='摘要' parents={[
          { name: '我的会议', link: '/' },
          { name: '会议详情', link: `/groups/${router.query.groupId}` },
        ]} />
      </CardHeader>
      <CardBody>
        {transcript ? <TranscriptDetail transcript={transcript} /> : <Text align='center'>正在加载摘要...</Text>}
      </CardBody>
    </Card>
  );
}

function TranscriptDetail(props: { transcript: GetTranscriptResponse }) {
  return (
    <Stack divider={<StackDivider />} spacing='6'>
      <GroupBanner group={props.transcript.group} />
      <Summaries transcript={props.transcript} />
    </Stack>
  );
}

function Summaries(props: { transcript: GetTranscriptResponse }) {
  // TODO: it doesn't seem to work. https://github.com/moment/moment/blob/develop/locale/zh-cn.js
  moment.locale('zh-cn');
  const t = props.transcript;
  invariant(t.summaries.length > 0);
  const [summaryIndex, setSummaryIndex] = useState(0);
  return (
    <Stack>
      <Table variant='striped'>
        <Thead>
          <Tr>
            <Th>开始时间</Th>
            <Th>时长</Th>
            <Th>版本</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>{capitalizeFirstChar(moment(t.startedAt).fromNow())}</Td>
            <Td>{capitalizeFirstChar(moment.duration(moment(t.endedAt).diff(t.startedAt)).humanize())}</Td>
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
      <Textarea isReadOnly height='30em' value={t.summaries[summaryIndex].summary} />
    </Stack>
  );
}
