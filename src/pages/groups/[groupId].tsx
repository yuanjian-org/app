import {
  Card,
  CardBody,
  Stack,
  Select,
  Box,
  Button,
  Spacer,
  Flex,
} from '@chakra-ui/react';
import React, { ReactNode } from 'react';
import AppLayout from "../../AppLayout";
import { trpcNext } from "../../trpc";
import GroupBar from 'components/GroupBar';
import { Transcript } from '../../shared/Transcript';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { diffInMinutes, prettifyDate, prettifyDuration } from 'shared/strings';
import { parseQueryString, parseQueryStringOrUnknown } from '../../parseQueryString';
import Loader from 'components/Loader';
import ReactMarkdown from 'react-markdown';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { componentSpacing, sectionSpacing } from 'theme/metrics';
import { Group } from 'shared/Group';
import replaceUrlParam from 'shared/replaceUrlParam';

export default function Page() {
  const router = useRouter();
  const groupId = parseQueryStringOrUnknown(router, "groupId");
  const { data: group } = trpcNext.groups.get.useQuery(groupId);

  return <>
    <PageBreadcrumb current='会议详情' parents={[
      { name: '我的会议', link: '/' },
    ]} />
    {group ? <GroupBox group={group} /> : <Loader />}
  </>;
};

Page.getLayout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;

function GroupBox({ group }: {
  group: Group
}) {
  const { data: transcripts } = trpcNext.transcripts.list.useQuery(group.id);

  return <Stack spacing={sectionSpacing}>
    <GroupBar group={group} showJoinButton showSelf abbreviateOnMobile={false} />
    {transcripts ? 
      (transcripts.length ? <TranscriptsBox transcripts={transcripts} /> : "无会议历史。（会议结束后一小时之内会显示在这里。）")
      :
      <Loader />
    }
  </Stack>;
}

/**
 * Caller should guarantee that `transcripts` has one or more items.
 */
function TranscriptsBox({ transcripts: unsorted }: {
  transcripts: Transcript[]
}) {
  // Make a shadow copy
  const sorted = [...unsorted];
  // Sort by reverse chronological order
  sorted.sort((t1, t2) => diffInMinutes(t1.startedAt, t2.startedAt));

  const router = useRouter();
  const getTranscriptAndIndex = () => {
    const id = parseQueryString(router, "transcriptId");
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].transcriptId == id) return { t: sorted[i], i };
    }
    return { t: sorted[0], i: 0 };
  };
  const { t: transcript, i: transcriptIndex } = getTranscriptAndIndex();

  const { data: summaries } = trpcNext.summaries.listToBeRenamed.useQuery(transcript.transcriptId);
  let summary = null;
  if (summaries) {
    // Every transcript should have at least one summary which is the raw transcripts.
    invariant(summaries.length);
    const key = parseQueryString(router, "summaryKey");
    const match = summaries.filter(s => s.summaryKey == key);
    summary = match.length ? match[0] : summaries[0];
  }

  return (
    <Flex direction="column" gap={sectionSpacing}>
      <Flex>
        <Button variant="ghost" leftIcon={<ChevronLeftIcon />}
          isDisabled={transcriptIndex == 0} 
          onClick={() => replaceUrlParam(router, "transcriptId", sorted[transcriptIndex - 1].transcriptId)}
        >前一次</Button>
        <Spacer />
        <Box>
          <Select value={transcript.transcriptId} 
            onChange={ev => replaceUrlParam(router, "transcriptId", ev.target.value)}
          >
            {sorted.map((t, idx) => <option key={t.transcriptId} value={t.transcriptId}>
              {`${prettifyDate(t.startedAt)}，${prettifyDuration(t.startedAt, t.endedAt)}${!idx ? "（最近通话）" : ""}`}
            </option>)}
          </Select>
        </Box>
        <Box marginLeft={componentSpacing}>
          {summaries && 
            <Select value={summary ? summary.summaryKey : ""}
              onChange={ev => replaceUrlParam(router, "summaryKey", ev.target.value)}
            >
              {summaries.map(s => <option key={s.summaryKey} value={s.summaryKey}>{s.summaryKey}</option>)}
            </Select>
          }
        </Box>
        <Spacer />
        <Button variant="ghost" rightIcon={<ChevronRightIcon />}
          isDisabled={transcriptIndex == sorted.length - 1}
          onClick={() => replaceUrlParam(router, "transcriptId", sorted[transcriptIndex + 1].transcriptId)}
        >后一次</Button>
      </Flex>
      <Card>
        {/* marginStart to give space for bullet points and numbers in markdown */}
        <CardBody marginStart={5}>
          {summary && <ReactMarkdown>{summary.summary}</ReactMarkdown>}
        </CardBody>
      </Card>
    </Flex>
  );
}
