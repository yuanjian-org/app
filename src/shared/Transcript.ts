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
   // Object user will be null if the handlebarName is not linked to any users
   // check routes/transcripts/getSummariesAndNameMap for details
  user: zMinUser.nullable(),
}));

export type TranscriptNameMap = z.TypeOf<typeof zTranscriptNameMap>;
