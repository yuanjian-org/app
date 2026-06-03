import { z } from "zod";
import { zRoles } from "./Role";
import { zMenteeStatus } from "./MenteeStatus";

export const zUserFilter = z.object({
  matchesNameOrEmail: z.string().optional(),
  containsRoles: zRoles.optional(),
  menteeStatus: zMenteeStatus.nullable().optional(),
  pointOfContactId: z.string().optional(),

  ids: z.array(z.string()).optional(),

  /**
   * If true, includes users whose roles don't include "Volunteer" or "Mentor".
   * Defaults to false.
   */
  includeNonVolunteersMentors: z.boolean().optional(),
  /**
   * If true, includes users who have been merged into another account. Requires UserManager permission. Defaults to false.
   */
  includeMerged: z.boolean().optional(),
  /**
   * If true, `matchesNameOrEmail` will also match mentees based on their assigned ongoing mentor's name or pinyin. Defaults to false.
   */
  includeMentorSearch: z.boolean().optional(),

  /**
   * If true, returns additional information about merged users, such as `wechatUnionId` and the `mergedToUser` object. Requires UserManager permission. Defaults to false.
   */
  returnMergeInfo: z.boolean().optional(),

  cursor: z.number().nullish(),
  limit: z.number().nullish(),
});
export type UserFilter = z.TypeOf<typeof zUserFilter>;
