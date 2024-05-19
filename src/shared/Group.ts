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
  coacheeId: z.string().uuid().nullable(),
});
export type Group = z.TypeOf<typeof zGroup>;

export function isOwned(g: Group) {
  return g.partnershipId || g.interviewId || g.calibrationId || g.coacheeId;
}

export const whereUnowned = {
  partnershipId: null,
  interviewId: null,
  calibrationId: null,
  coacheeId: null,
};

export function isPermittedForGroup(u: User, g: Group): boolean {
  // Public groups allow everyone to see member list and join group meetings but
  // not to read group history including transcripts and summaries.
  return g.public || isPermittedForGroupHistory(u, g);
}

export function isPermittedForGroupHistory(u: User, g: Group): boolean {
  return isPermitted(u.roles, "GroupManager") ||
    // Allow coaches to access all mentorship groups
    (isPermitted(u.roles, "MentorCoach") && g.partnershipId !== null) ||
    g.users.some(gu => gu.id === u.id);
}
