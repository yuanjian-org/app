import trpc, { trpcNext } from "trpc";
import Loader from "components/Loader";
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
} from "@chakra-ui/react";
import invariant from "tiny-invariant";
import { useRef, useState } from "react";
import Autosaver from "components/Autosaver";
import { TRPCClientError } from "@trpc/client";
import { Feedback, FeedbackDimension } from "shared/InterviewFeedback";
import { isPermitted } from "shared/Role";
import { InterviewType } from "shared/InterviewType";
import { useMyRoles } from "useMe";
import { menteeInterviewDimensions } from "shared/interviewDimentions";
import { mentorInterviewDimensions } from "shared/interviewDimentions";

export const summaryDimensionName = "总评";
export const summaryScoreLabels = ["拒", "弱拒", "弱收", "收"];

export function getScoreColor(scoreLabels: string[], score: number): string {
  invariant(scoreLabels.length == 4 || scoreLabels.length == 5);
  const backgrounds = [
    "red.600",
    "orange",
    ...(scoreLabels.length == 4 ? [] : ["gray"]),
    "green.300",
    "green.600",
  ];
  return backgrounds[score - 1];
}

function getDimension(f: Feedback, name: string): FeedbackDimension {
  const ds = (f.dimensions || []).filter((d) => d.name === name);
  if (ds.length > 0) {
    invariant(ds.length == 1);
    return ds[0];
  } else {
    return {
      name,
      score: undefined,
      comment: undefined,
    };
  }
}

/**
 * @returns a new Feedback object
 */
function setDimension(f: Feedback, dimension: FeedbackDimension): Feedback {
  return {
    dimensions: [
      ...(f.dimensions || []).filter((d) => dimension.name !== d.name),
      dimension,
    ],
  };
}

export function InterviewFeedbackEditor({
  type,
  interviewFeedbackId,
  readonly,
}: {
  type: InterviewType;
  interviewFeedbackId: string;
  readonly?: boolean;
}) {
  // See Editor()'s comment on the reason for `catchTime: 0`
  const { data } = trpcNext.interviewFeedbacks.get.useQuery(
    interviewFeedbackId,
    { cacheTime: 0 },
  );
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

  return (
    <Editor
      type={type}
      defaultFeedback={f.feedback}
      etag={data.etag}
      save={save}
      showDimensions
      readonly={readonly}
    />
  );
}

export function InterviewDecisionEditor({
  type,
  interviewId,
  decision,
  etag,
  readonly,
}: {
  type: InterviewType;
  interviewId: string;
  decision: Feedback | null;
  etag: number;
  readonly?: boolean;
}) {
  const myRoles = useMyRoles();

  const save = async (decision: Feedback, etag: number) => {
    return await trpc.interviews.updateDecision.mutate({
      interviewId,
      decision,
      etag,
    });
  };

  return (
    <Editor
      type={type}
      defaultFeedback={decision}
      etag={etag}
      save={save}
      readonly={readonly || !isPermitted(myRoles, "MentorshipAdmin")}
      showDimensions={false}
    />
  );
}

/**
 * WARNING: Set useQuery()'s option { catchTime: 0 } when fetching
 * `defaultFeedback`. Otherwise, useQuery() may return cached but stale data
 * first and then return newer data after a fetch. Becuase the editor ignors
 * subsequent data loads (see `useState` below), this would cause etag
 * validation error when the user attempts to edit data. See
 * https://tanstack.com/query/v4/docs/react/guides/caching
 */
function Editor({
  type,
  defaultFeedback,
  etag,
  save,
  showDimensions,
  readonly,
}: {
  type: InterviewType;
  defaultFeedback: Feedback | null;
  etag: number;
  save: (f: Feedback, etag: number) => Promise<number>;
  showDimensions: boolean;
  readonly?: boolean;
}) {
  // Only load the original feedback once, and not when the parent auto
  // refetches it. Changing content during edits may confuses the user to hell.
  const [feedback, setFeedback] = useState<Feedback>(
    defaultFeedback || { dimensions: [] },
  );
  const refEtag = useRef<number>(etag);

  const dimensions =
    type == "MenteeInterview"
      ? menteeInterviewDimensions
      : mentorInterviewDimensions;

  const onSave = async (f: Feedback) => {
    try {
      refEtag.current = await save(f, refEtag.current);
    } catch (e) {
      if (e instanceof TRPCClientError && e.data.code == "CONFLICT") {
        window.alert(
          "内容已被更新其他用户或窗口更新，无法继续保存。请刷新查看新内容。",
        );
      }
    }
  };

  return (
    <Flex direction="column" gap={6}>
      <DimensionEditor
        dimension={getDimension(feedback, summaryDimensionName)}
        dimensionLabel={`${summaryDimensionName}与备注`}
        scoreLabels={summaryScoreLabels}
        commentPlaceholder={
          "评分理由、" +
          (type == "MenteeInterview" ? "未来导师需关注的情况、" : "") +
          "自由记录（自动保存）"
        }
        readonly={readonly}
        onChange={(d) => setFeedback(setDimension(feedback, d))}
      />

      {showDimensions &&
        dimensions.map((name, idx) => (
          <DimensionEditor
            key={name}
            dimension={getDimension(feedback, name)}
            dimensionLabel={`${idx + 1}. ${name}`}
            scoreLabels={[
              "明显低于预期",
              "低于预期",
              "达到预期",
              "高于预期",
              "明显高于预期",
            ]}
            commentPlaceholder="评分理由，并例举具体回答（自动保存）"
            readonly={readonly}
            onChange={(d) => setFeedback(setDimension(feedback, d))}
          />
        ))}

      {!readonly && <Autosaver data={feedback} onSave={onSave} />}
    </Flex>
  );
}

function DimensionEditor({
  dimension: d,
  dimensionLabel,
  scoreLabels,
  commentPlaceholder,
  readonly,
  onChange,
}: {
  dimension: FeedbackDimension;
  dimensionLabel: string;
  scoreLabels: string[];
  commentPlaceholder: string;
  onChange: (d: FeedbackDimension) => void;
  readonly?: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const score = d.score ?? 1;
  const color = getScoreColor(scoreLabels, score);

  const change = (v: number) =>
    onChange({
      name: d.name,
      score: v,
      comment: d.comment,
    });

  const resetScore = () =>
    onChange({
      ...d,
      score: undefined,
    });

  return (
    <>
      <Flex direction="row" gap={3}>
        <Box minWidth={140}>
          <b>{dimensionLabel}</b>
        </Box>
        <Slider
          min={1}
          max={scoreLabels.length}
          step={1}
          isReadOnly={readonly}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          value={score}
          // onChangeEnd is needed to triger events when the user clicks on the
          // lowest score whilc d.score == null.
          onChangeEnd={change}
          // onChange is needed to triger events for other cases.
          onChange={change}
        >
          <SliderTrack>
            <SliderFilledTrack bg={color} />
          </SliderTrack>
          {scoreLabels.map((_, idx) => (
            <SliderMark
              key={idx}
              value={idx + 1}
              marginTop={3}
              marginLeft={-1}
              fontSize="xs"
              color="gray.400"
            >
              {idx + 1}
            </SliderMark>
          ))}

          <Tooltip
            hasArrow
            placement="top"
            isOpen={showTooltip}
            label={`${score}: ${scoreLabels[score - 1]}`}
          >
            <SliderThumb
              bg={color}
              opacity={d.score == null ? 0 : 1}
              onClick={readonly ? undefined : resetScore}
            />
          </Tooltip>
        </Slider>
      </Flex>

      <Textarea
        isReadOnly={readonly}
        {...(readonly ? {} : { placeholder: commentPlaceholder })}
        height="200px"
        {...(readonly ? {} : { background: "white" })}
        {...(d.comment ? { value: d.comment } : {})}
        onChange={(e) =>
          onChange({
            name: d.name,
            score: d.score,
            comment: e.target.value,
          })
        }
      />
    </>
  );
}
