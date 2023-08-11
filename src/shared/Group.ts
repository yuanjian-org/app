import { z } from "zod";
import { zMinUser } from "./User";

export const zGroup = z.object({
  id: z.string(),
  name: z.string().nullable(),
  users: z.array(zMinUser),
  partnershipId: z.string().uuid().nullable(),
  interviewId: z.string().uuid().nullable(),
  calibrationId: z.string().uuid().nullable(),
});
export type Group = z.TypeOf<typeof zGroup>;

export const zGroupCountingTranscripts = zGroup.merge(z.object({
  transcripts: z.array(z.object({}))
}));
export type GroupCountingTranscripts = z.TypeOf<typeof zGroupCountingTranscripts>;

export const zGroupWithTranscripts = zGroup.merge(z.object({
  transcripts: z.array(z.object({
    transcriptId: z.string(),
    startedAt: z.date(),
    endedAt: z.date(),
    summaries: z.array(z.object({
        summaryKey: z.string(),
    }))
  })),
}));
export type GroupWithTranscripts = z.TypeOf<typeof zGroupWithTranscripts>;

export function isOwned(g: Group) {
  return g.partnershipId || g.interviewId || g.calibrationId;
}

export const whereUnowned = { partnershipId: null, interviewId: null, calibrationId: null };
