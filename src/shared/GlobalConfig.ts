import z from "zod";
import { zDateColumn } from "./DateColumn";

export const zGlobalConfig = z.object({
  matchFeedbackEditableUntil: zDateColumn.optional(),
});
export type GlobalConfig = z.TypeOf<typeof zGlobalConfig>;
