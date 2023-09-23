import { z } from 'zod';

export const zTranscriptMetadata = z.object({
  startedAt: z.coerce.string(),
  endedAt: z.coerce.string(),
});

export const zTranscript = zTranscriptMetadata.merge(z.object({
  transcriptId: z.string(),
}));

export type Transcript = z.TypeOf<typeof zTranscript>;
