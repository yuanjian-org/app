import { z } from "zod";
import { zMinUser } from "./User";
import { zDateColumn, zOptionalDateColumn } from "./DateColumn";

export const zShudongPost = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  author: zMinUser.nullable(),
  isAnonymous: z.boolean(),
  markdown: z.string(),
  upvoteCount: z.number(),
  responseCount: z.number(),
  isEdited: z.boolean(),
  isDeleted: z.boolean(),
  createdAt: zDateColumn,
  updatedAt: zOptionalDateColumn,
  userHasUpvoted: z.boolean().optional(),
});

export type ShudongPost = z.infer<typeof zShudongPost>;
