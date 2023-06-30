import { procedure, router } from "../trpc";
import axios from "axios";
import apiEnv from "api/apiEnv";
import { listMeetings } from "api/TencentMeeting";
import OngoingMeetingCount from "api/database/models/OngoingMeetingCount";
import z from "zod";

/**
 * These API are to be periodically triggered for background operations and housekeeping.
 */
const cron = router({

  /**
   * Download transcripts and then upload them as summaries as is.
   * 
   * @returns An Id array of uploaded transcripts.
   */
  uploadRawTranscripts: procedure
  .output(z.array(z.string()))
  .query(async ({ ctx }) => {
    console.log('Retriving transcript URLs...');
    const headers = { 'Authorization': `Bearer ${apiEnv.INTEGRATION_AUTH_TOKEN}` };
    const baseUrl = `${ctx.protocol}//${ctx.host}/api/v1`;
    const res = await axios.get(`${baseUrl}/transcripts.list`, { headers });

    const promises = res.data.result.data.map(async (transcript: any) => {
      const id = transcript.transcriptId;
      console.log(`Downloading ${id}...`);
      try {
        const res = await axios.get(transcript.url);
        console.log(`Uploading ${id}...`);
        try {
          await axios.post(`${baseUrl}summaries.write`, {
            transcriptId: id,
            summaryKey: '原始文字（仅试验期用）',
            summary: res.data,
          }, { headers });
        } catch (e) {
          console.error(`Error uploading ${id}. Ignored:`, (e as Error).message);
        }
      } catch (e) {
        console.error(`Error downloading ${id}. Ignored:`, (e as Error).message);
      }
    });
    await Promise.all(promises);

    return res.data.result.data.map((t: any) => t.transcriptId);
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
