import { z } from "zod";
import { zDateColumn } from "./DateColumn";

export const zUserState = z.object({
  consentedAt: zDateColumn.optional(),
  declinedMergeModal: z.boolean().optional(),
  lastKudosReadAt: zDateColumn.optional(),

  // Last passed date of various exams.
  menteeInterviewerExam: zDateColumn.optional(),
});
export type UserState = z.TypeOf<typeof zUserState>;
