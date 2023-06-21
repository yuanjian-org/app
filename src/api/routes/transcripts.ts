import { procedure, router } from "../tServer";
import { authIntegration } from "../auth";
import { getRecordURLs, listRecords } from "api/tencentMeeting";

const transcripts = router({

  /**
   * @returns An array of transcript Ids and download URLs of all the transcripts created since the last 31 days
   * (max date range allowed by TencentMeeting). Note that the URLs are valid only for a short period of time.
   * 
   * Example:
   * 
   *  $ curl -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" http://${HOST}/api/trpc/transcripts.list | jq .
   *  {
   *    "result": {
   *      "data": [
   *        {
   *          "transcriptId": "4859248761693668472-1671044366052950017",
   *          "url": "https://...myqcloud.com/..."
   *        },
   *        {
   *          "transcriptId": "12764896794187134991-1666665499764408321",
   *          "url": "https://...myqcloud.com/..."
   *        }
   *      ]
   *    }
   *  }
   */
  list: procedure.use(
    authIntegration('transcripts:read')
  ).query(async () => {
    const res : Array<{ 
      transcriptId: string,
      url: string,
    }> = [];

    const promises = (await listRecords()).record_meetings
    // Only interested in records that are ready to download.
    .filter(meeting => meeting.state === 3)
    .map(async meeting => {
      const record = await getRecordURLs(meeting.meeting_record_id);
      record.record_files.map(file => {
        file.meeting_summary?.filter(summary => summary.file_type === 'txt')
        .map(summary => {
          res.push({
            transcriptId: formatTranscriptId(record.meeting_id, file.record_file_id),
            url: summary.download_address,
          });
        })
      });
    })

    await Promise.all(promises);
    return res;
  }),
});

export default transcripts;

function formatTranscriptId(meetingId: string, record_file_id: string): string {
  return `${meetingId}-${record_file_id}`; 
}

function parseTranscriptId(transcriptId: string) {
  const parsed = transcriptId.split('-');
  if (parsed.length !== 2 || !parsed.every(s => s.length > 1)) throw Error(`Invalid Transcript Id: ${transcriptId}`);
  return {
    meetingId: parsed[0],
    recordFileId: parsed[1],
  }
}
