import { z } from 'zod';
import { zMinUser } from './User';

// TODO: rename to Interviewer
export const zMinInterviewFeedback = z.object({
  id: z.string(),
  interviewer: zMinUser,
  feedbackUpdatedAt: z.coerce.string().nullable(),
});

export const zFeedback = z.record(z.string(), z.any());
export type Feedback = object; // z.ZodType<typeof zFeedback>; For some reason using z.ZodType upsets typescript.

export const zInterviewFeedback = zMinInterviewFeedback.merge(z.object({
  feedback: zFeedback.nullable(),
}));
export type InterviewFeedback = z.ZodType<typeof zInterviewFeedback>;
