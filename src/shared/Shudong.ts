import { z } from "zod";
import { zMinUser } from "./User";
import { zDateColumn, zNullableDateColumn } from "./DateColumn";

export const quickShudongEmojis = [
  "🤗",
  "💖",
  "💪",
  "👏",
  "🙏",
  "😊",
  "😂",
  "🎉",
] as const;

export const shudongEmojis = [
  "🤗",
  "💖",
  "💪",
  "👏",
  "🙏",
  "🤝",
  "😊",
  "🥰",
  "😄",
  "😂",
  "🙌",
  "👍",
  "🥺",
  "😭",
  "😅",
  "🤔",
  "😮",
  "😎",
  "🎉",
  "✨",
  "🌟",
  "🌹",
  "➕",
  "💡",
] as const;

export const zShudongEmoji = z.enum(shudongEmojis);
export type ShudongEmoji = z.infer<typeof zShudongEmoji>;

export const zShudongReactionSummary = z.object({
  emoji: zShudongEmoji,
  count: z.number(),
  userHasReacted: z.boolean(),
});
export type ShudongReactionSummary = z.infer<typeof zShudongReactionSummary>;

export const zShudongPost = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  /**
   * author is null if the post was posted anonymously or if the post has
   * been soft-deleted.
   */
  author: zMinUser.nullable(),
  /**
   * Indicates whether the current viewer is the author of this post (false if
   * soft-deleted).
   */
  userIsAuthor: z.boolean(),
  /**
   * Indicates whether the post was created by a mentor (false if
   * soft-deleted).
   */
  isMentorPosted: z.boolean(),
  markdown: z.string(),
  reactions: z.array(zShudongReactionSummary),
  responseCount: z.number(),
  isDeleted: z.boolean(),
  /**
   * Indicates whether the post content was AI generated.
   */
  isAiGenerated: z.boolean(),
  lastEditedAt: zNullableDateColumn,
  createdAt: zDateColumn,
  /**
   * userIsSubscribed is only valid for questions (i.e. root posts).
   */
  userIsSubscribed: z.boolean().optional(),
  /**
   * Label generated for pseudo-anonymity within a thread (e.g., "匿名楼主",
   * "匿名 A").
   */
  anonymousName: z.string().nullable().optional(),
});

export type ShudongPost = z.infer<typeof zShudongPost>;
