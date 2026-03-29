import { z } from "zod";
import { zDateColumn } from "./DateColumn";

export const zTranscript = z.object({
  startedAt: zDateColumn,
  endedAt: zDateColumn,
  id: z.string(),
});

export type Transcript = z.TypeOf<typeof zTranscript>;
