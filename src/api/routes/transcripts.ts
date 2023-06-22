import { procedure, router } from "../tServer";
import { authIntegration } from "../auth";
import { getRecordURLs, listRecords } from "api/tencentMeeting";
import invariant from "tiny-invariant";

const transcripts = router({

  /**
   * @returns An array of transcript Ids and download URLs of all the transcripts created since the last 31 days
   * (max date range allowed by TencentMeeting). Note that the URLs are valid only for a short period of time.
   * 
   * Example:
   * 
   *  $ curl -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" https://${HOST}/api/v1/transcripts.list | jq .
   *  {
   *    "result": {
   *      "data": [
   *        {
   *          "transcriptId": "a6df5959-1270-4b7b-9abe-82a8c59efb25.1671044366052950017.1685580846073.1685582675575",
   *          "url": "https://...myqcloud.com/..."
   *        },
   *        {
   *          "transcriptId": "59d15da1-a684-40ab-ad82-a3f8cf79ba5b.1666665499764408321.1685584316215.1685584547679",
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

    const promises = (await listRecords())
    // Only interested in records that are ready to download.
    .filter(meeting => meeting.state === 3)
    .map(async meeting => {
      invariant(meeting.record_files.length == 1);
      const startTime = meeting.record_files[0].record_start_time;
      const endTime = meeting.record_files[0].record_end_time;

      const record = await getRecordURLs(meeting.meeting_record_id);
      record.record_files.map(file => {
        file.meeting_summary?.filter(summary => summary.file_type === 'txt')
        .map(summary => {
          const id = 
          res.push({
            transcriptId: formatTranscriptId(meeting.subject, file.record_file_id, startTime, endTime),
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

function formatTranscriptId(groupId: string, recordFileId: string, startTime: number, endTime: number): string {
  return `${groupId}.${recordFileId}.${startTime}.${endTime}`; 
}

function parseTranscriptId(transcriptId: string) {
  const parsed = transcriptId.split('.');
  if (parsed.length !== 4 || !parsed.every(s => s.length > 1)) throw Error(`Invalid Transcript Id: ${transcriptId}`);
  return {
    groupId: parsed[0],
    recordFileId: parsed[1],
    startTime: Number(parsed[2]),
    endTime: Number(parsed[3]),
  }
}
