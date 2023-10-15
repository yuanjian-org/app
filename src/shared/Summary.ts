import { z } from 'zod';
import { zMinUser } from './User';

export const zSummary = z.object({
    transcriptId: z.string(),
    summaryKey: z.string(),
    summary: z.string(),
  });

export type Summary = z.TypeOf<typeof zSummary>;

export const zSummaryNameMap = z.object({
  handlebarName: z.string(),
  userId: z.string(),
  user: zMinUser,
});
