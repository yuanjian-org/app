import z from "zod";

export const zScheduledKudosEmail = z.object({
  type: z.literal("Kudos"),
  receiverId: z.string().uuid(),
});
export type ScheduledKudosEmail = z.TypeOf<typeof zScheduledKudosEmail>;

export const zScheduledEmailData = z.discriminatedUnion("type", [
  zScheduledKudosEmail,
]);

export type ScheduledEmailData = z.TypeOf<typeof zScheduledEmailData>;
