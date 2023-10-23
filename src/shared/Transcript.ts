import { z } from 'zod';
import { zMinUser } from './User';

export const zTranscript = z.object({
  startedAt: z.coerce.string(),
  endedAt: z.coerce.string(),
  transcriptId: z.string(),
});

export type Transcript = z.TypeOf<typeof zTranscript>;

export const zTranscriptNameMap = z.array(z.object({
  handlebarName: z.string(),
  user: zMinUser,
}));

export type TranscriptNameMap = z.TypeOf<typeof zTranscriptNameMap>;
