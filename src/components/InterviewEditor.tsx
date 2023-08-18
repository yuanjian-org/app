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
import { useRef, useState } from 'react';
import Autosaver from 'components/Autosaver';
import _ from "lodash";
import { TRPCClientError } from '@trpc/client';
import { Feedback as SharedFeedback } from "shared/InterviewFeedback";
import { useUserContext } from 'UserContext';
import { isPermitted } from 'shared/Role';

type Feedback = {
  dimensions: FeedbackDimension[],
};

type FeedbackDimension = {
  name: string,
  score: number | null,
  comment: string | null,
};

const dimensionNames = ["成绩优秀", "心中有爱", "脑中有料", "眼中有光", "脚下有土", "开放与成长思维", "个人潜力", "远见价值"];
const summaryDimensionName = "总评";

function getDimension(f: Feedback, name: string): FeedbackDimension {
  const ds = f.dimensions.filter(d => d.name === name);
  if (ds.length > 0) {
    invariant(ds.length == 1);
    return ds[0];
  } else {
    return {
      name,
      score: null,
      comment: null,
    };
  }
}

/**
 * @returns a new Feedback object
 */
function setDimension(f: Feedback, dimension: FeedbackDimension): Feedback {
  return {
    dimensions: [...f.dimensions.filter(d => dimension.name !== d.name), dimension],
  };
}

export function InterviewFeedbackEditor({ interviewFeedbackId, readonly }: { 
  interviewFeedbackId: string,
  readonly?: boolean,
}) {
  const { data } = trpcNext.interviewFeedbacks.get.useQuery(interviewFeedbackId);
  if (!data) return <Loader />;

  const f = data.interviewFeedback;

  const save = async (feedback: Feedback, etag: number) => {
    const data = {
      id: f.id,
      feedback,
      etag,
    };
    // TODO: A holistic solution.
    await trpc.interviewFeedbacks.logUpdateAttempt.mutate(data);
    return await trpc.interviewFeedbacks.update.mutate(data);    
  };

  return <Editor defaultFeedback={f.feedback} etag={data.etag} save={save} showDimensions readonly={readonly} />;
}

export function InterviewDecisionEditor({ interviewId, decision, etag }: { 
  interviewId: string,
  decision: SharedFeedback | null,
  etag: number,
}) {
  const [me] = useUserContext();

  const save = async (decision: Feedback, etag: number) => {
    return await trpc.interviews.updateDecision.mutate({
      interviewId,
      decision,
      etag,
    });    
  };

  return <Editor defaultFeedback={decision} etag={etag} save={save} showDimensions={false}
    readonly={!isPermitted(me.roles, "InterviewManager")}
  />;
}

function Editor({ defaultFeedback, etag, save, showDimensions, readonly }: {
  defaultFeedback: SharedFeedback | null,
  etag: number,
  save: (f: Feedback, etag: number) => Promise<number>,
  showDimensions: boolean,
  readonly?: boolean,
}) {
  // Only load the original feedback once, and not when the parent auto refetches it.
  // Changing content during edits may confuses the user to hell.
  const [feedback, setFeedback] = useState<Feedback>(defaultFeedback as Feedback || { dimensions: [] });
  const refEtag = useRef<number>(etag);

  const onSave = async (f: Feedback) => {
    try {
      refEtag.current = await save(f, refEtag.current);
    } catch (e) {
      if (e instanceof TRPCClientError && e.data.code == "CONFLICT") {
        window.alert("内容已被更新其他用户或窗口更新。无法在此页继续保存。请刷新以查看最新内容。");
      }
    }
  };

  return <Flex direction="column" gap={6}>
    <DimensionEditor 
      dimension={getDimension(feedback, summaryDimensionName)}
      dimensionLabel={`${summaryDimensionName}与备注`}
      scoreLabels={["拒", "弱拒", "弱收", "收"]}
      commentPlaceholder="评分理由、学生特点、未来导师需关注的情况等（自动保存）"
      readonly={readonly}
      onChange={d => setFeedback(setDimension(feedback, d))}
    />

    {showDimensions && dimensionNames.map((name, idx) => <DimensionEditor 
      key={name}
      dimension={getDimension(feedback, name)}
      dimensionLabel={`${idx + 1}. ${name}`}
      scoreLabels={["明显低于预期", "低于预期", "达到预期", "高于预期", "明显高于预期"]}
      commentPlaceholder="评分理由，并例举学生的具体回答（自动保存）"
      readonly={readonly}
      onChange={d => setFeedback(setDimension(feedback, d))}
    />)}

    {!readonly && <Autosaver
      // This conditional is to prevent initial page loading from triggering auto saving.
      data={_.isEqual(feedback, defaultFeedback) ? null : feedback}
      onSave={onSave}
    />}
  </Flex>;
}

function DimensionEditor({ 
  dimension: d, dimensionLabel, scoreLabels, commentPlaceholder, readonly, onChange,
}: {
  dimension: FeedbackDimension,
  dimensionLabel: string,
  scoreLabels: string[],
  commentPlaceholder: string,
  onChange: (d: FeedbackDimension) => void,
  readonly?: boolean,
}) {
  invariant(scoreLabels.length == 4 || scoreLabels.length == 5);
  const backgrounds = [
    "orange.600", "orange", 
    ...scoreLabels.length == 4 ? [] : ["grey"],
    "green.400", "green"
  ];
  
  const [showTooltip, setShowTooltip] = useState(false);
  const score = d.score ?? 1;

  return <>
    <Flex direction="row" gap={3}>
      <Box minWidth={140}><b>{dimensionLabel}</b></Box>
      <Slider min={1} max={scoreLabels.length} step={1} isReadOnly={readonly}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        value={score}
        onChange={v => onChange({
          name: d.name,
          score: v,
          comment: d.comment,
        })}
      >
        <SliderTrack><SliderFilledTrack bg={backgrounds[score - 1]} /></SliderTrack>
        {scoreLabels.map((_, idx) => <SliderMark key={idx} value={idx + 1}>.</SliderMark>)}
        
        <Tooltip
          hasArrow
          placement='top'
          isOpen={showTooltip}
          label={`${score}: ${scoreLabels[score - 1]}`}
        >
          <SliderThumb bg={backgrounds[score - 1]} />
        </Tooltip>
      </Slider>
    </Flex>

    <Textarea
      isReadOnly={readonly}
      {...readonly ? {} : { placeholder: commentPlaceholder }}
      height="150px"
      {...readonly ? {} : { background: "white" }}
      {...d.comment ? { value: d.comment } : {}}
      onChange={e => onChange({
        name: d.name,
        score: d.score,
        comment: e.target.value,
      })} />
  </>;
}
