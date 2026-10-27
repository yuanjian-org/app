import { z } from "zod";
import { zMinUser } from "./User";
import { zNullableDateColumn } from "./DateColumn";

export const zInterviewer = z.object({
  id: z.string(),
  interviewer: zMinUser,
  feedbackUpdatedAt: zNullableDateColumn,
});

export const zFeedbackDimension = z.object({
  name: z.string(),
  // Allow null as historical database records may store null for unset fields.
  score: z.number().nullish(),
  comment: z.string().nullish(),
});
export type FeedbackDimension = z.TypeOf<typeof zFeedbackDimension>;

export const zFeedback = z.object({
  dimensions: z.array(zFeedbackDimension).optional(),
});
export type Feedback = z.TypeOf<typeof zFeedback>;

export const zInterviewFeedback = zInterviewer.merge(
  z.object({
    feedback: zFeedback.nullable(),
  }),
);
export type InterviewFeedback = z.TypeOf<typeof zInterviewFeedback>;
