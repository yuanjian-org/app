import z from "zod";

export const zMeetingSlot = z.object({
  id: z.number(),
  tmUserId: z.string(),
  meetingId: z.string(),
  meetingLink: z.string(),
  groupId: z.string().nullable(),
});

export type MeetingSlot = z.TypeOf<typeof zMeetingSlot>;
