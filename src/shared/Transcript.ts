import { z } from 'zod';
import { zGroup } from "shared/Group";

export const zTranscript = z.object({
    transcriptId: z.string(),
    startedAt: z.date(),
    endedAt: z.date(),
    group: zGroup,
    summaries: z.array(z.object({
        summaryKey: z.string(),
        summary: z.string(),
    })),
  });

export type Transcript = z.TypeOf<typeof zTranscript>;
