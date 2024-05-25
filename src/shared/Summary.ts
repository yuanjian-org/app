import { z } from 'zod';

export const zSummary = z.object({
  transcriptId: z.string(),
  summaryKey: z.string(),
  summary: z.string(),
});

export type Summary = z.TypeOf<typeof zSummary>;

export const zSpeakerStats = z.array(z.object({
  speaker_name: z.string(),
  total_time: z.number(),
}));

export type SpeakerStats = z.infer<typeof zSpeakerStats>;
