import { z } from "zod";
import { zDateColumn } from "./DateColumn";

export const zUserState = z.object({
  consentedAt: zDateColumn.optional(),
  declinedMergeModal: z.boolean().optional(),
  lastKudosReadAt: zDateColumn.optional(),
});
export type UserState = z.TypeOf<typeof zUserState>;
