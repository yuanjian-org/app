import { z } from "zod";
import { zMinUser } from "./User";

export const zChatMessage = z.object({
  id: z.string().uuid(),
  user: zMinUser,
  markdown: z.string(),
  updatedAt: z.coerce.string().optional(),
  createdAt: z.coerce.string().optional(),
});
export type ChatMessage = z.TypeOf<typeof zChatMessage>;
