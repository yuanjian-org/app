import { z } from "zod";
import { zRoles } from "./Role";
import { zMenteeStatus } from "./MenteeStatus";

export const zUserFilter = z.object({
  matchesNameOrEmail: z.string().optional(),
  containsRoles: zRoles.optional(),
  menteeStatus: zMenteeStatus.nullable().optional(),
  pointOfContactId: z.string().optional(),

  includeNonVolunteers: z.boolean().optional(),
  includeMerged: z.boolean().optional(),

  returnMergeInfo: z.boolean().optional(),
});
export type UserFilter = z.TypeOf<typeof zUserFilter>;
