import z from "zod";
import { zOptionalDateColumn } from "./DateColumn";

export const zMeetingSlot = z.object({
  id: z.number(),
  tmUserId: z.string(),
  meetingId: z.string(),
  meetingLink: z.string(),
  groupId: z.string().nullable(),
  updatedAt: zOptionalDateColumn,
});

export type MeetingSlot = z.TypeOf<typeof zMeetingSlot>;