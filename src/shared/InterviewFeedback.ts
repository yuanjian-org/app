import { z } from "zod";
import { zMinUser } from "./User";
import { zNullableDateColumn } from "./DateColumn";

export const zInterviewer = z.object({
  id: z.string(),
  interviewer: zMinUser,
  feedbackUpdatedAt: zNullableDateColumn,
});

// TODO: Replace with zInterviewFeedback
export const zFeedbackDeprecated = z.record(z.string(), z.any());
// z.ZodType<typeof zFeedback>; For some reason using z.ZodType upsets
// typescript.
export type FeedbackDeprecated = object;

export const zFeedbackDimension = z.object({
  name: z.string(),
  score: z.number().optional(),
  comment: z.string().optional(),
});
export type FeedbackDimension = z.TypeOf<typeof zFeedbackDimension>;

export const zFeedback = z.object({
  dimensions: z.array(zFeedbackDimension).optional(),
});
export type Feedback = z.TypeOf<typeof zFeedback>;

export const zInterviewFeedback = zInterviewer.merge(
  z.object({
    feedback: zFeedbackDeprecated.nullable(),
  }),
);
export type InterviewFeedback = z.TypeOf<typeof zInterviewFeedback>;
