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
  userId: z.string(),
  selections: z.array(zMentorSelection),
  finalizedAt: zDateColumn.nullable(),
});
export type MentorSelectionBatch = z.TypeOf<typeof zMentorSelectionBatch>;
