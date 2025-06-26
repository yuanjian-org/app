import z from "zod";

export const zMergeTokenErrorEvent = z.object({
  type: z.literal("MergeTokenError"),
  token: z.string(),
  error: z.string(),
});
export type MergeTokenErrorEvent = z.TypeOf<typeof zMergeTokenErrorEvent>;

export const zMeetingCreationEvent = z.object({
  type: z.literal("MeetingCreation"),
  tmUserId: z.string(),
  meetingId: z.string(),
  meetingLink: z.string().url(),
});
export type MeetingCreationEvent = z.TypeOf<typeof zMeetingCreationEvent>;

export const zEventLogData = z.discriminatedUnion("type", [
  zMergeTokenErrorEvent,
  zMeetingCreationEvent,
]);

export type EventLogData = z.TypeOf<typeof zEventLogData>;
