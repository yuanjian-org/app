import z from "zod";

export const zScheduledEmailType = z.enum(["Kudos", "Chat", "Task"]);
export type ScheduledEmailType = z.TypeOf<typeof zScheduledEmailType>;
