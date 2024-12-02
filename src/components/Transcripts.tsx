import {
  Card,
  CardBody,
  Select,
  Button,
  Spacer,
  Flex,
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { trpcNext } from "../trpc";
import { Transcript } from '../shared/Transcript';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { diffInMinutes, prettifyDate, prettifyDuration } from 'shared/strings';
import { parseQueryString } from "shared/strings";
import Loader from 'components/Loader';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { componentSpacing, sectionSpacing } from 'theme/metrics';
import replaceUrlParam from 'shared/replaceUrlParam';
import { breakpoint } from 'theme/metrics';
import MarkdownStyler from './MarkdownStyler';

export default function Transcripts({ groupId }: {
  groupId: string,
}) {
  const { data: transcripts } = trpcNext.transcripts.list.useQuery({ groupId });
  return !transcripts ? <Loader /> 
    : transcripts.length ? <LoadedTranscripts transcripts={transcripts} />
    : <Text color="gray">无通话记录。会议结束后一小时之内会显示在这里。</Text>;
}

/**
 * Caller should guarantee that `transcripts` has one or more items.
 */
function LoadedTranscripts({ transcripts: unsorted }: {
  transcripts: Transcript[]
}) {
  // Make a shadow copy
  const sorted = [...unsorted];
  // Sort by reverse chronological order
  sorted.sort((t1, t2) => diffInMinutes(t1.startedAt, t2.startedAt));
  // Only show transcripts that are more than 1 min
  const filtered = sorted.filter(t => diffInMinutes(t.startedAt, t.endedAt) >= 1);

  const router = useRouter();
  const getTranscriptAndIndex = () => {
    const id = parseQueryString(router, "transcriptId");
    for (let i = 0; i < filtered.length; i++) {
      if (filtered[i].transcriptId == id) return { t: filtered[i], i };
    }
    return { t: filtered[0], i: 0 };
  };
  const { t: transcript, i: transcriptIndex } = getTranscriptAndIndex();

  const { data: summaries } = trpcNext.summaries.list.useQuery(transcript.transcriptId);
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
          isDisabled={transcriptIndex == filtered.length - 1}
          onClick={() => replaceUrlParam(router, "transcriptId", filtered[transcriptIndex + 1].transcriptId)}
        >前一次</Button>
        <Spacer />
        <Flex direction={{ base: "column", [breakpoint]: "row" }} gap={componentSpacing}>
          <Select value={transcript.transcriptId} 
            onChange={ev => replaceUrlParam(router, "transcriptId", ev.target.value)}
          >
            {filtered.map((t, idx) => <option key={t.transcriptId} value={t.transcriptId}>
              {`${prettifyDate(t.startedAt)}，${prettifyDuration(t.startedAt, t.endedAt)}${!idx ? "（最近通话）" : ""}`}
            </option>)}
          </Select>
          {summaries && summary && 
            <Select value={summary.summaryKey}
              onChange={ev => replaceUrlParam(router, "summaryKey", ev.target.value)}
            >
              {summaries.map(s => <option key={s.summaryKey} value={s.summaryKey}>{s.summaryKey}</option>)}
            </Select>
          }
        </Flex>
        <Spacer />
        <Button variant="ghost" rightIcon={<ChevronRightIcon />}
          isDisabled={transcriptIndex == 0}
          onClick={() => replaceUrlParam(router, "transcriptId", sorted[transcriptIndex - 1].transcriptId)}        
        >后一次</Button>
      </Flex>
      {!summary ? <Loader /> :
        <Card variant="outline" backgroundColor="backgroundLight">
          <CardBody>
            <MarkdownStyler content={summary.summary} />
          </CardBody>
        </Card>
      }
    </Flex>
  );
}
