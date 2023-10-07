import { z } from 'zod';

export const zTranscript = z.object({
  startedAt: z.coerce.string(),
  endedAt: z.coerce.string(),
  transcriptId: z.string(),
});

export type Transcript = z.TypeOf<typeof zTranscript>;
