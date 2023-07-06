import { procedure, router } from "../trpc";
import axios from "axios";
import apiEnv from "api/apiEnv";
import { listMeetings } from "api/TencentMeeting";
import OngoingMeetingCount from "api/database/models/OngoingMeetingCount";
import z from "zod";
import { findMissingCrudeSummaries, saveCrudeSummary } from "./summaries";

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
  .query(async ({ ctx }) => {
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

  /**
   * Check the ongoing meetings and update the OngoingMeetingCount table
   */
  updateOngoingMeetingCounts: procedure.mutation(async () => {
    const count = (await listMeetings()).meeting_info_list.filter(obj => obj.status === 'MEETING_STATE_STARTED').length;

    OngoingMeetingCount.upsert({
      TMAdminUserId: apiEnv.TM_ADMIN_USER_ID,
      count,
    })
  })

});

export default cron;
