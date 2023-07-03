import { procedure, router } from "../trpc";
import { authIntegration, authUser } from "../auth";
import { getRecordURLs, listRecords } from "../TencentMeeting";
import invariant from "tiny-invariant";
import { z } from "zod";
import Transcript from "../database/models/Transcript";
import Summary from "../database/models/Summary";
import Group from "../database/models/Group";
import User from "../database/models/User";
import { TRPCError } from "@trpc/server";
import { isPermitted } from "../../shared/Role";

const zGetTranscriptResponse = z.object({
  transcriptId: z.string(),
  startedAt: z.date(),
  endedAt: z.date(),
  group: z.object({
    id: z.string(),
    users: z.array(z.object({
      id: z.string(),
      name: z.string().nullable(),
    }))      
  }),
  summaries: z.array(z.object({
      summaryKey: z.string(),
      summary: z.string(),
  })),
});

export type GetTranscriptResponse = z.TypeOf<typeof zGetTranscriptResponse>;

const transcripts = router({

  /**
   * @returns An array of transcript Ids and download URLs of all the transcripts created in the last 31 days
   * (31 is the max date range allowed by TencentMeeting). Note that the URLs are valid only for a short period of time.
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
  list: procedure
  .use(authIntegration())
  .query(async () => {
    const res : Array<{ 
      transcriptId: string,
      url: string,
    }> = [];

    const promises = (await listRecords())
    // Only interested in records that are ready to download.
    .filter(meeting => meeting.state === 3)
    .map(async meeting => {
      // Only interested in records that refers to valid groups.
      const groupId = meeting.subject;
      if (!await groupExists(groupId)) {
        console.log(`Group doesn't exist. Igore: "${groupId}"`)
        return;
      }

      if (!meeting.record_files) return;
      invariant(meeting.record_files.length == 1);
      const startTime = meeting.record_files[0].record_start_time;
      const endTime = meeting.record_files[0].record_end_time;

      const record = await getRecordURLs(meeting.meeting_record_id);
      record.record_files.map(file => {
        file.meeting_summary?.filter(summary => summary.file_type === 'txt')
        .map(summary => {
          const id = 
          res.push({
            transcriptId: encodeTranscriptId(groupId, file.record_file_id, startTime, endTime),
            url: summary.download_address,
          });
        })
      });
    })

    await Promise.all(promises);
    return res;
  }),

  get: procedure
    // We will throw access denied later if the user isn't a privileged user and isn't in the group.
  .use(authUser())
  .input(z.object({ id: z.string() }))
  .output(zGetTranscriptResponse)
  .query(async ({ input, ctx }) => {
    const t = await Transcript.findByPk(input.id, {
      include: [Summary, {
        model: Group,
        include: [{
          model: User,
          attributes: ['id', 'name'],
        }]
      }]
    });
    if (!t) {
      throw new TRPCError({ code: 'NOT_FOUND', message: `Transcript ${input.id} not found` });
    }
    if (!isPermitted(ctx.user.roles, 'SummaryEngineer') && !t.group.users.some(u => u.id === ctx.user.id )) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `User has no access to Transcript ${input.id}` });
    }
    return t;
  })
});

export default transcripts;

export function encodeTranscriptId(groupId: string, transcriptId: string, startTime: number, endTime: number): string {
  return `${groupId}.${transcriptId}.${startTime}.${endTime}`; 
}

export function decodeTranscriptId(encoded: string) {
  const parsed = encoded.split('.');
  if (parsed.length !== 4 || !parsed.every(s => s.length > 1)) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Invalid Transcript Id: ${encoded}`
    });
  }
  return {
    groupId: parsed[0],
    transcriptId: parsed[1],
    startedAt: Number(parsed[2]),
    endedAt: Number(parsed[3]),
  }
}

async function groupExists(groupId: string) {
  // Without `safeParse` sequalize may throw an exception on invalid UUID strings.
  return z.string().uuid().safeParse(groupId).success && (await Group.count({
    where: { id: groupId }
  })) > 0;
}
