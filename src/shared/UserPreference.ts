import { z } from "zod";
import { zDateColumn } from "./DateColumn";
import { zTraitsPreference } from "./Traits";

export const zMentorPreference = z.object({
  最多匹配学生: z.number().optional(),
  不参加就业辅导: z.boolean().optional(),
  学生特质: zTraitsPreference.optional(),
});
export type MentorPreference = z.TypeOf<typeof zMentorPreference>;

export const defaultMentorCapacity = 2;

export const zInterviewerPreference = z.object({
  optIn: z.boolean().optional(),
  limit: z
    .object({
      noMoreThan: z.number(),
      until: zDateColumn,
    })
    .optional(),
});
export type InterviewerPreference = z.TypeOf<typeof zInterviewerPreference>;

export const zUserPreference = z.object({
  interviewer: zInterviewerPreference.optional(),
  mentor: zMentorPreference.optional(),
});
export type UserPreference = z.TypeOf<typeof zUserPreference>;
