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

export const typedMessagePrefix = "【";
export const oneOnOneMessagePrefix = "【一对一】";
export const transactionalRequestMessagePrefix = "【不定期请求】";
export const mentorReviewMessagePrefix = "【导师访谈】";
export const menteeReviewMessagePrefix = "【学生访谈】";
