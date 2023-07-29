import { z } from 'zod';
import { zMinUser } from './User';

export const zMinInterviewFeedback = z.object({
  id: z.string(),
  interviewer: zMinUser,
  feedbackCreatedAt: z.string().datetime().nullable(),
});

export const zInterviewFeedback = zMinInterviewFeedback.merge(z.object({
  feedback: z.record(z.string(), z.any()).nullable(),
}));
export type InterviewFeedback = z.ZodType<typeof zInterviewFeedback>;
