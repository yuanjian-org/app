import { procedure, router } from "../trpc";
import axios from "axios";
import z from "zod";
import { findMissingCrudeSummaries, saveCrudeSummary } from "./summaries";
import { updateOngoingMeetings } from "./meetings";

/**
 * These API are to be periodically triggered for background operations and housekeeping.
 */
const cron = router({

  /**
   * Download crude summaries from Tencent Meeting and save them locally.
   * 
   * @returns the transcriptIds of synced transcripts.
   */
  syncCrudeSummaries: procedure
  .output(z.object({
    syncedCrudeSummaries: z.array(z.string()),
  }))
  .mutation(async () => {
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
    }
  }),

  updateOngoingMeetings: procedure.mutation(updateOngoingMeetings)
});

export default cron;
