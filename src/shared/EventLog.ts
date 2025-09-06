import z from "zod";

export const zMeetingCreationEvent = z.object({
  type: z.literal("MeetingCreation"),
  tmUserId: z.string(),
  meetingId: z.string(),
  meetingLink: z.string().url(),
});
export type MeetingCreationEvent = z.TypeOf<typeof zMeetingCreationEvent>;

export const zEventLogData = z.discriminatedUnion("type", [
  zMeetingCreationEvent,
]);

export type EventLogData = z.TypeOf<typeof zEventLogData>;
