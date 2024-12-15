import z from "zod";

export const zMergeTokenErrorEvent = z.object({
  type: z.literal("MergeTokenError"),
  token: z.string(),
  error: z.string(),
});
export type MergeTokenErrorEvent = z.TypeOf<typeof zMergeTokenErrorEvent>;

export const zEventLogData = z.discriminatedUnion("type", [
  zMergeTokenErrorEvent,
]);

export type EventLogData = z.TypeOf<typeof zEventLogData>;
