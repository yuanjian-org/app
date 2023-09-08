import { procedure, router } from "../trpc";
import axios from "axios";
import z from "zod";
import { findMissingCrudeSummaries, saveCrudeSummary } from "./summaries";
import { updateOngoingMeetings } from "./meetings";

/**
 * Download crude summaries from Tencent Meeting and save them locally.
 * 
 * @returns the transcriptIds of synced transcripts.
 */
const syncCrudeSummaries = procedure
  .output(z.object({
    syncedCrudeSummaries: z.array(z.string()),
  }))
  .mutation(async () => 
{
  console.log('Looking for missing crude summaries...');
  const summaries = await findMissingCrudeSummaries();

  const promises = summaries.map(async summary => {
    console.log(`Downloading ${summary.transcriptId}...`);
    const res = await axios.get(summary.url);
    await saveCrudeSummary(summary, res.data);
  });
  await Promise.all(promises);

  return {
    syncedCrudeSummaries: summaries.map((t: any) => t.transcriptId),
  };
});

export default router({
  syncCrudeSummaries,
  updateOngoingMeetings: procedure.mutation(updateOngoingMeetings),
});
