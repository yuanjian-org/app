import { z } from 'zod';

export const zSummary = z.object({
    transcriptId: z.string(),
    summaryKey: z.string(),
    summary: z.string(),
  });

export type Summary = z.TypeOf<typeof zSummary>;
