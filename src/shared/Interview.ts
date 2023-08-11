import { z } from 'zod';
import { zMinUser } from './User';
import { zMinInterviewFeedback } from './InterviewFeedback';
import { zGroup } from './Group';

export const zInterviewType = z.enum(["MenteeInterview", "MentorInterview"]);
export type InterviewType = z.TypeOf<typeof zInterviewType>;

export const zInterview = z.object({
    id: z.string(),
    type: zInterviewType,
    calibrationId: z.string().nullable(),
    interviewee: zMinUser,
    feedbacks: z.array(zMinInterviewFeedback),
  });
export type Interview = z.TypeOf<typeof zInterview>;

export const zInterviewWithGroup = zInterview.merge(z.object({
  group: zGroup,
}));
