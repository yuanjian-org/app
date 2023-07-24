import { z } from 'zod';
import { zMinUser } from './User';
import { zMinInterviewFeedback } from './InterviewFeedback';

// TODO: rename to Mentee/MentorInterview
export const zInterviewType = z.enum(["MenteeInterview", "MentorInterview"]);
export type InterviewType = z.TypeOf<typeof zInterviewType>;

export const zInterview = z.object({
    id: z.string(),
    type: zInterviewType,
    interviewee: zMinUser,
    feedbacks: z.array(zMinInterviewFeedback),
  });
export type Interview = z.TypeOf<typeof zInterview>;
