import { procedure, router } from "../trpc";
import axios from "axios";
import apiEnv from "api/apiEnv";
import { listMeetings } from "api/TencentMeeting";
import OngoingMeetingCount from "api/database/models/OngoingMeetingCount";
import z from "zod";
import invariant from "tiny-invariant";

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
  .output(z.object({
    uploadedTranscripts: z.array(z.string()),
  }))
  .query(async ({ ctx }) => {
    console.log('Retriving transcript URLs...');
    const headers = { 'Authorization': `Bearer ${apiEnv.INTEGRATION_AUTH_TOKEN}` };
    const baseUrl = `${ctx.baseUrl}/api/v1`;
    const res = await axios.get(`${baseUrl}/transcripts.list`, { headers });

    const promises = res.data.result.data.map(async (transcript: any) => {
      const id = transcript.transcriptId;
      console.log(`Downloading ${id}...`);
      const res = await axios.get(transcript.url);
      console.log(`Uploading ${id}...`);
      await axios.post(`${baseUrl}/summaries.write`, {
        transcriptId: id,
        summaryKey: '原始文字（仅试验期用）',
        summary: res.data,
      }, { headers });
    });
    await Promise.all(promises);

    return {
      uploadedTranscripts: res.data.result.data.map((t: any) => t.transcriptId),
    }
  }),

  /**
   * Check the ongoing meetings and update the OngoingMeetingCount table
   */
  updateOngoingMeetingCounts: procedure.mutation(async () => {
    const ongoingMeeting = await OngoingMeetingCount.findByPk(apiEnv.TM_ADMIN_USER_ID);
    invariant(ongoingMeeting);

    const count = (await listMeetings(ongoingMeeting.meetingId)).meeting_info_list[0].status === 'MEETING_STATE_STARTED'? 1 : 0;

    OngoingMeetingCount.upsert({
      TMAdminUserId: apiEnv.TM_ADMIN_USER_ID,
      count,
    })
  })

});

export default cron;
