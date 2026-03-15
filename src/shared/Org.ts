import { z } from "zod";
import { zMinUser } from "./User";
import { zRoles } from "./Role";
import { zUserProfile } from "./UserProfile";

export const zOrg = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});
export type Org = z.infer<typeof zOrg>;

export const zOrgMentor = zMinUser.and(
  z.object({
    roles: zRoles.optional(),
    profile: zUserProfile.optional().nullable(),
  }),
);
export type OrgMentor = z.infer<typeof zOrgMentor>;

export const zOrgWithMembers = zOrg.extend({
  mentors: z.array(zOrgMentor),
  owners: z.array(zMinUser),
});

export type OrgWithMembers = z.infer<typeof zOrgWithMembers>;
