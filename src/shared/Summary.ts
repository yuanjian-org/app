import { z } from 'zod';

export const zSummary = z.object({
  transcriptId: z.string(),
  summaryKey: z.string(),
  summary: z.string(),
});

export type Summary = z.TypeOf<typeof zSummary>;

export const zSummaryNameMap = z.record(z.string());

export type SummaryNameMap = z.TypeOf<typeof zSummaryNameMap>;
