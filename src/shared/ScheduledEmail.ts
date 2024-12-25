import z from "zod";

export const zScheduledKudosEmail = z.object({
  type: z.literal("Kudos"),
  receiverId: z.string().uuid(),
});
export type ScheduledKudosEmail = z.TypeOf<typeof zScheduledKudosEmail>;

export const zScheduledChatEmail = z.object({
  type: z.literal("Chat"),
  roomId: z.string().uuid(),
});
export type ScheduledChatEmail = z.TypeOf<typeof zScheduledChatEmail>;

export const zScheduledEmailData = z.discriminatedUnion("type", [
  zScheduledKudosEmail,
  zScheduledChatEmail,
]);

export type ScheduledEmailData = z.TypeOf<typeof zScheduledEmailData>;
