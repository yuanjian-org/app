import z from "zod";
import { zDateColumn } from "./DateColumn";

export const zGlobalConfig = z.object({
  matchFeedbackEditableUntil: zDateColumn.optional(),
  showEditMessageTimeButton: z.boolean().optional(),
});
export type GlobalConfig = z.TypeOf<typeof zGlobalConfig>;
