import z from "zod";

export const zScheduledNotificationType = z.enum([
  "Kudos",
  "Chat",
  "Task",
  // New responses to an existing Shudong question.
  "ShudongResponse",
  // New Shudong questions, for globally subscribed users.
  "ShudongQuestion",
]);
export type ScheduledNotificationType = z.TypeOf<
  typeof zScheduledNotificationType
>;
