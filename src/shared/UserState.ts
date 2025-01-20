import { z } from "zod";
import { zDateColumn } from "./DateColumn";

export const zUserState = z.object({
  consentedAt: zDateColumn.optional(),
  declinedMergeModal: z.boolean().optional(),
  lastKudosReadAt: zDateColumn.optional(),
  lastTasksReadAt: zDateColumn.optional(),

  // Last passed date of various exams.
  // 招生面试流程及标准评测
  menteeInterviewerExam: zDateColumn.optional(),
  // 《导师手册》评测
  handbookExam: zDateColumn.optional(),
  // 《学生通信原则》评测
  commsExam: zDateColumn.optional(),
});
export type UserState = z.TypeOf<typeof zUserState>;
