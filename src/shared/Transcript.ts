import { z } from 'zod';
import { zDateColumn } from './DateColumn';

export const zTranscript = z.object({
  startedAt: zDateColumn,
  endedAt: zDateColumn,
  transcriptId: z.string(),
});

export type Transcript = z.TypeOf<typeof zTranscript>;
