import { z } from "zod";
import { zMinUser } from "./User";

export const zOrg = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Org = z.infer<typeof zOrg>;

import { zRoles } from "./Role";
import { zUserProfile } from "./UserProfile";

export const zOrgWithMembers = zOrg.extend({
  mentors: z.array(
    zMinUser.and(
      z.object({
        profile: zUserProfile.optional().nullable(),
        roles: zRoles.optional(),
      }),
    ),
  ),
  owners: z.array(zMinUser),
});

export type OrgWithMembers = z.infer<typeof zOrgWithMembers>;
