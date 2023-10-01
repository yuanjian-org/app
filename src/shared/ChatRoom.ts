import { z } from "zod";
import { zChatMessage } from "./ChatMessage";

export const zChatRoom = z.object({
  id: z.string().uuid(),
  messages: z.array(zChatMessage),
});
export type ChatRoom = z.TypeOf<typeof zChatRoom>;
