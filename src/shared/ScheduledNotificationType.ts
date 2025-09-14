import z from "zod";

export const zScheduledNotificationType = z.enum(["Kudos", "Chat", "Task"]);
export type ScheduledNotificationType = z.TypeOf<
  typeof zScheduledNotificationType
>;
