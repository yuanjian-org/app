import { z } from 'zod';

export const zSummary = z.object({
  transcriptId: z.string(),
  key: z.string(),
  markdown: z.string(),
});

export type Summary = z.TypeOf<typeof zSummary>;
