import {
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Select,
  Button,
  Spacer,
  Flex,
  Text,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { trpcNext } from "../trpc";
import { Transcript } from '../shared/Transcript';
import { useRouter } from 'next/router';
import invariant from 'tiny-invariant';
import { diffInMinutes, prettifyDate, prettifyDuration } from 'shared/strings';
import { parseQueryString } from "shared/strings";
import Loader from 'components/Loader';
import ReactMarkdown from 'react-markdown';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { componentSpacing, sectionSpacing } from 'theme/metrics';
import replaceUrlParam from 'shared/replaceUrlParam';
import { sidebarBreakpoint } from 'components/Navbars';
import { MinUser } from 'shared/User';
import { SummaryNameMapModal } from './SummaryNameMapModal';

export default function Transcripts({ groupId, groupUsers }: {
  groupId: string
  groupUsers?: MinUser[]
}) {
  const { data: transcripts } = trpcNext.transcripts.list.useQuery({ groupId });
  return !transcripts ? <Loader /> :
    (transcripts.length && groupUsers) ?
      <LoadedTranscripts transcripts={transcripts} groupUsers={groupUsers} /> :
      <Text color="gray">无通话历史。会议结束后一小时之内会显示在这里。</Text>;
}

/**
 * Caller should guarantee that `transcripts` has one or more items.
 */
function LoadedTranscripts({ transcripts: unsorted, groupUsers }: {
  transcripts: Transcript[]
  groupUsers: MinUser[]
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
  let summary: { summaryKey: string; summary: string; } | null = null;
  if (summaries) {
    // Every transcript should have at least one summary which is the raw transcripts.
    invariant(summaries.length);
    const key = parseQueryString(router, "summaryKey");
    const match = summaries.filter(s => s.summaryKey == key);
    summary = match.length ? match[0] : summaries[0];
  }

  const { data: transcriptNameMap } = trpcNext.transcripts.getNameMap.useQuery({ transcriptId: transcript.transcriptId });

  const [nameMapModal, setNameMapModal] = useState(false);
  const handleNameMapModal = async () => {
    setNameMapModal(!nameMapModal);
  };

  return (
    <Flex direction="column" gap={sectionSpacing}>
      <Flex>
        <Button variant="ghost" leftIcon={<ChevronLeftIcon />}
          isDisabled={transcriptIndex == sorted.length - 1}
          onClick={() => replaceUrlParam(router, "transcriptId", sorted[transcriptIndex + 1].transcriptId)}
        >前一次</Button>
        <Spacer />
        <Flex direction={{ base: "column", [sidebarBreakpoint]: "row" }} gap={componentSpacing}>
          <Select value={transcript.transcriptId}
            onChange={ev => replaceUrlParam(router, "transcriptId", ev.target.value)}
          >
            {sorted.map((t, idx) => <option key={t.transcriptId} value={t.transcriptId}>
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
        <Button onClick={handleNameMapModal} variant='brand' >用户匹配</Button>
        <Spacer />
        <Button variant="ghost" rightIcon={<ChevronRightIcon />}
          isDisabled={transcriptIndex == 0}
          onClick={() => replaceUrlParam(router, "transcriptId", sorted[transcriptIndex - 1].transcriptId)}
        >后一次</Button>
      </Flex>
      {!summary ? <Loader /> :
        <Card variant="outline" backgroundColor="backgroundLight">
          <CardBody>
            <ReactMarkdown>{summary.summary}</ReactMarkdown>
          </CardBody>
        </Card>
      }
      {nameMapModal &&
        (transcriptNameMap ?
          <SummaryNameMapModal
            transcriptNameMap={transcriptNameMap}
            groupUsers={groupUsers}
            onClose={() => {
              handleNameMapModal();
            }} /> :
          <Alert status='warning'>
            <AlertIcon />
            未找到需要匹配的用户ID
          </Alert>)}
    </Flex>
  );
}
