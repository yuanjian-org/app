import { z } from "zod";
import { zMinUser } from "./User";
import { zDateColumn } from "./DateColumn";

export const zMentorSelection = z.object({
  mentor: zMinUser,
  reason: z.string(),
  order: z.number(),
});
export type MentorSelection = z.TypeOf<typeof zMentorSelection>;

export const zMentorSelectionBatch = z.object({
  id: z.string(),
  selections: z.array(zMentorSelection),
  // Only finalized batches are supported. Add `.nullable()` to support drafts.
  finalizedAt: zDateColumn,
});
export type MentorSelectionBatch = z.TypeOf<typeof zMentorSelectionBatch>;
