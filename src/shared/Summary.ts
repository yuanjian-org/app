import { diffWords } from "diff";
import { z } from "zod";

export const zSummary = z.object({
  transcriptId: z.string(),
  key: z.string(),
  markdown: z.string(),
  initialLength: z.number(),
  deletedLength: z.number(),
});

export type Summary = z.TypeOf<typeof zSummary>;

export const maxDeletionRatio = 0.2;

export function computeDeletion(old: Summary, edited: string) {
  const diff = diffWords(old.markdown, edited, { ignoreCase: true });
  const deleted = diff
    .filter((change) => change.removed)
    .map((change) => change.value);

  const len =
    old.deletedLength + deleted.reduce((acc, str) => acc + str.length, 0);

  const allowed = len <= old.initialLength * maxDeletionRatio;

  return { deleted, totalDeletedLength: len, allowed };
}
