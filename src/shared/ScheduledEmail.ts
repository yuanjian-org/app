import z from "zod";

export const zScheduledLikeEmailData = z.object({
  type: z.literal("Like"),
  userId: z.string().uuid(),
  before: z.array(z.object({
    likerId: z.string().uuid(),
    count: z.number(),
  }))
});
export type ScheduledLikeEmailData = z.TypeOf<typeof zScheduledLikeEmailData>;

export const zScheduledEmailData = z.discriminatedUnion("type", [
  zScheduledLikeEmailData,
]);

export type ScheduledEmailData = z.TypeOf<typeof zScheduledEmailData>;
