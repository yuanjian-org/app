import { procedure, router } from "../trpc";
import axios from "axios";
import apiEnv from "api/apiEnv";
import { listSelectedMeeting } from "api/TencentMeeting";
import OngoingMeetings from "api/database/models/OngoingMeetings";
import z from "zod";
import { findMissingCrudeSummaries, saveCrudeSummary } from "./summaries";
import invariant from "tiny-invariant";

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

  /**
   * Check the ongoing meetings and update the OngoingMeetingCount table
   */
  updateOngoingMeetings: procedure.mutation(async () => {
    const ongoingMeetings = await OngoingMeetings.findAll();
    if (ongoingMeetings) {
      for (const meeting of ongoingMeetings) {
        const status = (await listSelectedMeeting(meeting.meetingId, meeting.tmUserId)).meeting_info_list[0].status;
        if (status === 'MEETING_STATE_STARTED') {
          OngoingMeetings.update({ status }, { where: { groupId: meeting.groupId } })
        } else {
          if (meeting.status !== 'MEETING_STATE_READY') {
            OngoingMeetings.destroy({ where: { groupId: meeting.groupId } });
          }
        }
      }
    }
  })

});

export default cron;
