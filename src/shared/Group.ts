import { z } from "zod";
import { zMinUser } from "./User";
import { zRoles } from "./Role";
import { zTranscriptMetadata } from "./Transcript";

export const zGroup = z.object({
  id: z.string(),
  name: z.string().nullable(),
  roles: zRoles,
  users: z.array(zMinUser),
  partnershipId: z.string().uuid().nullable(),
  interviewId: z.string().uuid().nullable(),
  calibrationId: z.string().uuid().nullable(),
  coacheeId: z.string().uuid().nullable(),
});
export type Group = z.TypeOf<typeof zGroup>;

export const zGroupCountingTranscripts = zGroup.merge(z.object({
  transcripts: z.array(zTranscriptMetadata),
}));
export type GroupCountingTranscripts = z.TypeOf<typeof zGroupCountingTranscripts>;

export function isOwned(g: Group) {
  return g.partnershipId || g.interviewId || g.calibrationId || g.coacheeId;
}

export const whereUnowned = {
  partnershipId: null,
  interviewId: null,
  calibrationId: null,
  coacheeId: null,
};
