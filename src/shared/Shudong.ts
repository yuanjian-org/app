import { z } from "zod";
import { zMinUser } from "./User";
import { zDateColumn, zNullableDateColumn } from "./DateColumn";

export const zShudongPost = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  /**
   * author is null if the post was posted anonymously or soft-deleted.
   */
  author: zMinUser.nullable(),
  markdown: z.string(),
  upvoteCount: z.number(),
  responseCount: z.number(),
  isDeleted: z.boolean(),
  lastEditedAt: zNullableDateColumn,
  createdAt: zDateColumn,
  userHasUpvoted: z.boolean(),
  userIsSubscribed: z.boolean().optional(),
});

export type ShudongPost = z.infer<typeof zShudongPost>;
