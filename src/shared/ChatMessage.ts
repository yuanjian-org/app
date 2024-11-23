import { z } from "zod";
import { zMinUser } from "./User";
import { zOptionalDateColumn } from "./DateColumn";

export const zChatMessage = z.object({
  id: z.string().uuid(),
  user: zMinUser,
  markdown: z.string(),
  updatedAt: zOptionalDateColumn,
  createdAt: zOptionalDateColumn,
});
export type ChatMessage = z.TypeOf<typeof zChatMessage>;
