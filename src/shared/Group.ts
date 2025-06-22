import { z } from "zod";
import User, { zMinUser } from "./User";
import { isPermitted } from "./Role";

export const zGroup = z.object({
  id: z.string(),
  name: z.string().nullable(),
  users: z.array(zMinUser),
  public: z.boolean(),
  archived: z.boolean(),

  partnershipId: z.string().uuid().nullable(),
  interviewId: z.string().uuid().nullable(),
  calibrationId: z.string().uuid().nullable(),
});
export type Group = z.TypeOf<typeof zGroup>;

export function isOwned(g: Group) {
  return g.partnershipId || g.interviewId || g.calibrationId;
}

export function isPermittedToAccessGroup(u: User, g: Group): boolean {
  // Public groups allow everyone to see member list and join group meetings but
  // not to read group history including transcripts and summaries.
  return g.public || isPermittedToAccessGroupHistory(u, g);
}

export function isPermittedToAccessGroupHistory(u: User, g: Group): boolean {
  return isPermitted(u.roles, "GroupManager") ||
    g.users.some(gu => gu.id === u.id);
}
