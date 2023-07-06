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
import React, { useMemo, useState } from 'react';
import { NextPageWithLayout } from "../../../../NextPageWithLayout";
import AppLayout from "../../../../AppLayout";
import trpcNext from "../../../../trpcNext";
import moment from 'moment';
import GroupBar from 'components/GroupBar';
import { Transcript } from 'api/routes/transcripts';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { capitalizeFirstChar } from 'shared/string';

const Page: NextPageWithLayout = () => <TranscriptCard />;

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

function TranscriptCard() {
  const router = useRouter();
  const id = typeof router.query.transcriptId === 'string' ? router.query.transcriptId : 'nonexistence';
  const { data: transcript } : { data: Transcript | undefined } = trpcNext.transcripts.get.useQuery({ id });

  return (<>
    <PageBreadcrumb current='摘要' parents={[
      { name: '我的会议', link: '/' },
      { name: '会议详情', link: `/groups/${router.query.groupId}` },
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
            <Th>会议时间</Th>
            <Th>时长</Th>
            <Th>摘要版本</Th>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>{capitalizeFirstChar(moment(t.startedAt).fromNow())}</Td>
            <Td>{moment.duration(moment(t.endedAt).diff(t.startedAt)).asMinutes()} 分钟</Td>
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
      <Editor value={t.summaries[summaryIndex].summary} />;
    </Stack>
  );
}

// Markdown editor from https://www.npmjs.com/package/react-simplemde-editor.
// Beow is a hack from https://github.com/dabit3/next.js-amplify-workshop/issues/21#issuecomment-843188036 to work around
// the "navigator is not defined" issue.
import "easymde/dist/easymde.min.css";
import dynamic from "next/dynamic";
import Loader from 'components/Loader';
const SimpleMdeEditor = dynamic(
	() => import("react-simplemde-editor"),
	{ ssr: false }
);

function Editor(props : { value: string }) {
  // See https://www.npmjs.com/package/react-simplemde-editor#options on why using memo here.
  const options = useMemo(() => ({
      spellChecker: false,
      readOnly: true,
    }), []);
  return <SimpleMdeEditor value={props.value} options={options} />;
}
