import { z } from 'zod';
import { zMinUser } from './User';

export const zMinInterviewFeedback = z.object({
  id: z.string(),
  interviewer: zMinUser,
  feedbackCreatedAt: z.string().datetime().nullable(),
});

export type MinInterviewFeedback = z.TypeOf<typeof zMinInterviewFeedback>;
