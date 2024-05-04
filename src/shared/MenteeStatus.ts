import z from "zod";

export const AllMenteeStatuses = [
  "待面试",
  "现届学子",
  "活跃校友",
  "退出校友",
  "学友",
] as const;

export type MenteeStatus = typeof AllMenteeStatuses[number];

export const zMenteeStatus = z.enum(AllMenteeStatuses);
