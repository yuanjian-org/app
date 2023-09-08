import { z } from 'zod';

export const zTranscript = z.object({
    transcriptId: z.string(),
    // For some reason coerce is needed to avoid zod input validation error.
    startedAt: z.coerce.string(),
    endedAt: z.coerce.string(),
  });

export type Transcript = z.TypeOf<typeof zTranscript>;
