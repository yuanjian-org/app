import z from "zod";

export const zMeetingSlot = z.object({
  id: z.number().optional(),
  tmUserId: z.string().optional(),
  meetingId: z.string(),
  meetingLink: z.string().url(),
  groupId: z.string().nullable()
});

export type MeetingSlot = z.TypeOf<typeof zMeetingSlot>;
