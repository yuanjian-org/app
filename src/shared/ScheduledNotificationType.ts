import z from "zod";

export const zScheduledNotificationType = z.enum([
  "Kudos",
  "Chat",
  "Task",
  // New responses to an existing Shudong question.
  "ShudongResponse",
  // New Shudong questions, for globally notified users.
  "ShudongQuestion",
]);
export type ScheduledNotificationType = z.TypeOf<
  typeof zScheduledNotificationType
>;
