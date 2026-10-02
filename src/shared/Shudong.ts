import { z } from "zod";
import { zMinUser } from "./User";
import { zDateColumn, zOptionalDateColumn } from "./DateColumn";

export const zShudongPost = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  /**
   * author is null if the post was posted anonymously or if the post has been soft-deleted.
   */
  author: zMinUser.nullable(),
  markdown: z.string(),
  upvoteCount: z.number(),
  responseCount: z.number(),
  isEdited: z.boolean(),
  isDeleted: z.boolean(),
  lastEditedAt: zOptionalDateColumn,
  createdAt: zDateColumn,
  userHasUpvoted: z.boolean().optional(),
});

export type ShudongPost = z.infer<typeof zShudongPost>;
