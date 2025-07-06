import { z } from "zod";

const AllInterviewTypes = ["MenteeInterview", "MentorInterview"] as const;

export type InterviewType = (typeof AllInterviewTypes)[number];

export const zInterviewType = z.enum(AllInterviewTypes);
