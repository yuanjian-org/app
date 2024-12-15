import z from "zod";

export const zScheduledLikeEmail = z.object({
  type: z.literal("Like"),
  userId: z.string().uuid(),
  before: z.array(z.object({
    likerId: z.string().uuid(),
    count: z.number(),
  }))
});
export type ScheduledLikeEmail = z.TypeOf<typeof zScheduledLikeEmail>;

export const zScheduledEmailData = z.discriminatedUnion("type", [
  zScheduledLikeEmail,
]);

export type ScheduledEmailData = z.TypeOf<typeof zScheduledEmailData>;
