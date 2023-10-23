import { z } from 'zod';
import { zMinUser } from './User';

export const zSummary = z.object({
  transcriptId: z.string(),
  summaryKey: z.string(),
  summary: z.string(),
});

export type Summary = z.TypeOf<typeof zSummary>;

export const zTranscriptNameMap = z.object({
  handlebarName: z.string(),
  user: zMinUser,
});
