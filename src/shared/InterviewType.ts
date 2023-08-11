import { z } from 'zod';

export const zInterviewType = z.enum(["MenteeInterview", "MentorInterview"]);
export type InterviewType = z.TypeOf<typeof zInterviewType>;
