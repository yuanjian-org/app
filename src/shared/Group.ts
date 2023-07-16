import { z } from "zod";
import { zMinUserProfile } from "./UserProfile";

export const zGroup = z.object({
  id: z.string(),
  name: z.string().nullable(),
  users: z.array(zMinUserProfile),
  partnershipId: z.string().uuid().nullable(),
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
