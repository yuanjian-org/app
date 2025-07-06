import z from "zod";

/**
 * null status means pending screening
 */
export const AllMenteeStatuses = [
  "初拒",
  "面拒",

  "现届学子",
  "仅奖学金",
  "仅不定期",

  "活跃校友",
  "退出校友",
  "劝退",
  "学友",
] as const;

export type MenteeStatus = (typeof AllMenteeStatuses)[number];

export const zMenteeStatus = z.enum(AllMenteeStatuses);
