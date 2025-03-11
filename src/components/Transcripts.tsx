import {
  Card,
  CardBody,
  Select,
  Button,
  Spacer,
  Flex,
  Text
} from '@chakra-ui/react';
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
import { Group, isPermittedToAccessGroupHistory } from 'shared/Group';
import useMe from 'useMe';

export default function Transcripts({ group }: {
  group: Group,
}) {
  if (!isPermittedToAccessGroupHistory(useMe(), group)) {
    return <Text color="gray">您没有访问会议摘要的权限。</Text>;
  } else {
    return <PermittedTranscripts groupId={group.id} />;
  }
}

function PermittedTranscripts({ groupId }: {
  groupId: string,
}) {
  const { data } = trpcNext.transcripts.list.useQuery({ groupId });

  // Make a shadow copy
  const sorted = [...(data ?? [])];
  // Sort by reverse chronological order
  sorted.sort((t1, t2) => diffInMinutes(t1.startedAt, t2.startedAt));
  // Only show transcripts that are more than 1 min
  const filtered = sorted.filter(t => diffInMinutes(t.startedAt, t.endedAt) >= 1);

  return !data ? <Loader /> 
    : filtered.length ? <LoadedTranscripts transcripts={filtered} />
    : <Text color="gray">会议摘要将在会议结束后一小时内显示在这里。</Text>;
}

function LoadedTranscripts({ transcripts }: {
  transcripts: Transcript[]
}) {
  const router = useRouter();

  const getTranscriptAndIndex = () => {
    const id = parseQueryString(router, "transcriptId");
    for (let i = 0; i < transcripts.length; i++) {
      if (transcripts[i].transcriptId == id) {
        return { transcript: transcripts[i], transcriptIndex: i };
      }
    }
    return { transcript: transcripts[0], transcriptIndex: 0 };
  };
  const { transcript, transcriptIndex } = getTranscriptAndIndex();

  const { data: summaries } = trpcNext.summaries.list.useQuery(
    transcript.transcriptId);

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
          isDisabled={transcriptIndex == transcripts.length - 1}
          onClick={() => replaceUrlParam(router, "transcriptId", transcripts[transcriptIndex + 1].transcriptId)}
        >前一次</Button>
        <Spacer />
        <Flex direction={{ base: "column", [breakpoint]: "row" }} gap={componentSpacing}>
          <Select value={transcript.transcriptId} 
            onChange={ev => replaceUrlParam(router, "transcriptId", ev.target.value)}
          >
            {transcripts.map((t, idx) => <option key={t.transcriptId} value={t.transcriptId}>
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
          onClick={() => replaceUrlParam(router, "transcriptId", transcripts[transcriptIndex - 1].transcriptId)}        
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
