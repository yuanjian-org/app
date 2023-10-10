import { z } from 'zod';

export const zSummary = z.object({
    transcriptId: z.string(),
    summaryKey: z.string(),
    summary: z.string(),
  });

export type Summary = z.TypeOf<typeof zSummary>;

export const zNameMap = z.record(z.string());

export type NameMap = z.TypeOf<typeof zNameMap>;
