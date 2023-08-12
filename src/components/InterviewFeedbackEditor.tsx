import trpc, { trpcNext } from 'trpc';
import Loader from 'components/Loader';
import {
  Flex,
  Box,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  SliderMark,
  Tooltip,
  Textarea,
} from '@chakra-ui/react';
import invariant from "tiny-invariant";
import { AutosavingMarkdownEditor } from 'components/MarkdownEditor';
import { useRef, useState } from 'react';
import Autosaver from 'components/Autosaver';
import { InterviewFeedback } from 'shared/InterviewFeedback';
import _ from "lodash";
import moment from 'moment';
import { TRPCError } from '@trpc/server';
import { TRPCClientError } from '@trpc/client';

type Feedback = {
  dimensions: FeedbackDimension[],
};

type FeedbackDimension = {
  name: string,
  score: number,
  comment: string,
};

const defaultScore = 1;
const defaultComment = "";

function findDimension(f: Feedback | null, dimensionName: string): FeedbackDimension | null {
  if (!f) return null;
  const ds = f.dimensions.filter(d => d.name === dimensionName);
  if (ds.length > 0) {
    invariant(ds.length == 1);
    return ds[0];
  } else {
    return null;
  }
}

export default function InterviewFeedbackEditor({ feedbackId, editable }: { 
  feedbackId: string,
  editable: boolean,
}) {
  const { data } = trpcNext.interviewFeedbacks.get.useQuery(feedbackId);
  const refEtag = useRef<number | null>(null);

  const getFeedback = () => data?.interviewFeedback.feedback ? 
    data.interviewFeedback.feedback as Feedback : { dimensions: [] };

  const dimensionNames = ["成绩优秀", "心中有爱", "脑中有料", "眼中有光", "脚下有土", "开放与成长思维", "个人潜力", "远见价值"];
  const summaryDimensionName = "总评";
  const summaryDimensions = getFeedback().dimensions.filter(d => d.name === summaryDimensionName);
  const summaryDimension = summaryDimensions.length == 1 ? summaryDimensions[0] : null;

  const saveDimension = async (edited: FeedbackDimension) => {
    if (!data) return;
    if (refEtag.current == null) refEtag.current = data.etag;

    const old = getFeedback();
    const f = structuredClone(old);
    const d = findDimension(f, edited.name);
    if (edited.score == defaultScore && edited.comment == defaultComment) {
      f.dimensions = f.dimensions.filter(d => d.name !== edited.name);
    } else if (d) {
      d.score = edited.score;
      d.comment = edited.comment;
    } else {
      f.dimensions.push(edited);
    }
    
    if (_.isEqual(f, old)) return;

    try {
      refEtag.current = await trpc.interviewFeedbacks.update.mutate({ 
        id: feedbackId,
        feedback: f,
        etag: refEtag.current,
      });
    } catch (e) {
      if (e instanceof TRPCClientError && e.data.code == "CONFLICT") {
        window.alert("有更新版本，无法继续保存。请刷新此页重试。");
      }
    }
  };

  return !data ? <Loader /> : <Flex direction="column" gap={6}>
    <FeedbackDimensionEditor 
      editorKey={`${feedbackId}-${summaryDimensionName}`}
      dimensionName={summaryDimensionName}
      dimensionLabel={`${summaryDimensionName}与备注`}
      scoreLabels={["拒", "弱拒", "弱收", "收"]}
      initialScore={summaryDimension?.score || defaultScore}
      initialComment={summaryDimension?.comment || defaultComment}
      onSave={async (d) => await saveDimension(d)}
      placeholder="评分理由、学生特点、未来导师需关注的情况等（自动保存）"
      editable={editable}
    />

    {dimensionNames.map((dn, idx) => {
      const d = findDimension(getFeedback(), dn);
      return <FeedbackDimensionEditor 
        key={dn} 
        editorKey={`${feedbackId}-${dn}`}
        dimensionName={dn}
        dimensionLabel={`${idx + 1}. ${dn}`}
        scoreLabels={["明显低于预期", "低于预期", "达到预期", "高于预期", "明显高于预期"]}
        initialScore={d?.score || defaultScore}
        initialComment={d?.comment || defaultComment}
        onSave={async (d) => await saveDimension(d)}
        placeholder="评分理由，包括学生回答的具体例子（自动保存）"
        editable={editable}
      />;
    })}
  </Flex>;
}

/**
 * N.B. scores are 1-indexed while labels are 0-index.
 */
function FeedbackDimensionEditor({ 
  editorKey, dimensionName, dimensionLabel, scoreLabels, initialScore, initialComment, onSave, placeholder, editable
}: {
  editorKey: string,
  dimensionName: string,
  dimensionLabel: string,
  scoreLabels: string[],
  initialScore: number,
  initialComment: string,
  placeholder: string,
  onSave: (d: FeedbackDimension) => Promise<void>,
  editable: boolean,
}) {
  const [score, setScore] = useState<number>(initialScore);
  const [comment, setComment] = useState<string>(initialComment);
  const [showTooltip, setShowTooltip] = useState(false);

  return <>
    <Flex direction="row" gap={3}>
      <Box minWidth={140}><b>{dimensionLabel}</b></Box>
      <Slider min={1} max={scoreLabels.length} step={1} defaultValue={initialScore} isReadOnly={!editable}
        onChange={setScore}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <SliderTrack><SliderFilledTrack bg="brand.b" /></SliderTrack>
        {scoreLabels.map((_, idx) => <SliderMark key={idx} value={idx + 1}>.</SliderMark>)}
        <Tooltip
          hasArrow
          placement='top'
          isOpen={showTooltip}
          label={`${score}: ${scoreLabels[score - 1]}`}
        >
          <SliderThumb bg="brand.b" />
        </Tooltip>
      </Slider>
      {editable && <Autosaver
        // This conditional is to prevent initial page loading from triggering auto saving.
        data={score == initialScore ? null : score} 
        onSave={async (_) => await onSave({ name: dimensionName, score, comment })}
      />}
    </Flex>
    {editable ?
      // TODO: Change to use Textarea.
      <AutosavingMarkdownEditor
        key={editorKey} 
        initialValue={initialComment} 
        onSave={async (edited) => { setComment(edited); await onSave({ name: dimensionName, score, comment: edited }); }}
        placeholder={placeholder}
        toolbar={false}
        status={false}
        maxHeight="120px"
      />
      :
      <Textarea isReadOnly value={initialComment} height="142px" />
    }
  </>;
}
