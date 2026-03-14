import { z } from "zod";
import { zMinUser } from "./User";

export const zOrganization = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Organization = z.infer<typeof zOrganization>;

export const zOrganizationWithMembers = zOrganization.extend({
  mentors: z.array(zMinUser),
  owners: z.array(zMinUser),
});

export type OrganizationWithMembers = z.infer<typeof zOrganizationWithMembers>;
