import { procedure, router } from "../trpc";
import { authIntegration } from "../auth";
import { z } from "zod";
import Transcript from "../database/models/Transcript";
import Summary from "../database/models/Summary";
import { getRecordURLs, listRecords } from "../TencentMeeting";
import invariant from "tiny-invariant";
import Group from "../database/models/Group";
import { TRPCError } from "@trpc/server";
import { safeDecodeMeetingSubject } from "./meetings";
import apiEnv from "api/apiEnv";

const crudeSummaryKey = "原始文字";

export interface CrudeSummaryDescriptor {
  groupId: string,
  transcriptId: string,
  startedAt: number,
  endedAt: number,
  url: string,
};

const zSummariesListInput = z.object({
  key: z.string(),
  excludeTranscriptsWithKey: z.string().optional(),
});

type SummariesListInput = z.TypeOf<typeof zSummariesListInput>;

/**
 * Return all summaries identified by the summary key `key`. If `excludeTranscriptsWithKey` is specified, exclude
 * summaries for the transcripts that already have summaries identified by this key.
 * 
 * See docs/summarization.md for usage.
 * 
 * Example:
 * 
 * $ curl -G https://${HOST}/api/v1/summaries.list \
 *    -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
 *    --data-urlencode 'input={ "key": "SummaryKey1", "excludeTranscriptsWithKey": "SummaryKey2" }'
 */
const list = procedure
  .use(authIntegration())
  .input(zSummariesListInput)
  .output(
    z.array(z.object({
      transcriptId: z.string(),
      summary: z.string(),
    }))
  ).query(async ({ input }: { input: SummariesListInput }) => 
{
  // TODO: Optimize and use a single query to return final results.
  const summaries = await Summary.findAll({ 
    where: { summaryKey: input.key },
    attributes: ['transcriptId', 'summary'],
  });

  const skippedTranscriptIds = input.excludeTranscriptsWithKey ? (await Summary.findAll({
    where: { summaryKey: input.excludeTranscriptsWithKey },
    attributes: ['transcriptId'],
  })).map(s => s.transcriptId) : [];

  return summaries
    .filter(s => !skippedTranscriptIds.includes(s.transcriptId));
});

/**
 * Upload a summary for a transcript. Each summary is identified by `transcriptId` and `summaryKey`.
 * Uploading a summary that already exists overwrites it.
 * 
 * See docs/summarization.md for usage.
 * 
 * @param transcriptId Returned from /api/v1/summaries.list
 * @param summaryKey An arbitrary string determined by the caller
 * 
 * Example:
 * 
 * $ curl -X POST https://${HOST}/api/v1/summaries.write \
 *    -H "Content-Type: application/json" \
 *    -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
 *    -d '{ \
 *      "transcriptId": "1671726726708793345", \
 *      "summaryKey": "llm_v1", \
 *      "summary": "..." }'
 */
const write = procedure
  .use(authIntegration())
  .input(
    z.object({ 
      transcriptId: z.string(),
      summaryKey: z.string(),
      summary: z.string(),
    })
  ).mutation(async ({ input }) => 
{
  if (input.summaryKey === crudeSummaryKey) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Summaries with key "${crudeSummaryKey}" are read-only`,
    })
  }
  // By design, this statement fails if the transcript doesn't exist.
  await Summary.upsert({
    transcriptId: input.transcriptId,
    summaryKey: input.summaryKey,
    summary: input.summary,
  });
});

const summaries = router({
  list,
  write,
});
export default summaries;

export async function saveCrudeSummary(meta: CrudeSummaryDescriptor, summary: string) {
  // `upsert` not `insert` because the system may fail after inserting the transcript row and before inserting the 
  // summary.
  await Transcript.upsert({
    transcriptId: meta.transcriptId,
    groupId: meta.groupId,
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
  });
  await Summary.create({
    transcriptId: meta.transcriptId,
    summaryKey: crudeSummaryKey,
    summary
  });
}

/**
 * Returns crude summaries that 1) were created in the last 31 days, and 2) only exist in Tencent Meeting but not 
 * locally. 31 days are the max query range allowed by Tencent. 
 * 
 * Note that the returned URLs are valid only for a short period of time.
 */
export async function findMissingCrudeSummaries(): Promise<CrudeSummaryDescriptor[]> {
  const ret: CrudeSummaryDescriptor[] = [];
  const promises = [];
  for (const tmUserId of apiEnv.TM_ADMIN_USER_IDS) {
    const promise = (await listRecords(tmUserId))
      // Only interested in meetings that are ready to download.
      .filter(meeting => meeting.state === 3)
      .map(async meeting => {
        // Only interested in meetings that refers to valid groups.
        const groupId = safeDecodeMeetingSubject(meeting.subject);
        if (!groupId || !(await Group.count({ where: { id: groupId } }))) {
          console.log(`Ignoring invalid meeting subject or non-existing group "${meeting.subject}"`)
          return;
        }

        if (!meeting.record_files) return;
        invariant(meeting.record_files.length == 1);
        const startTime = meeting.record_files[0].record_start_time;
        const endTime = meeting.record_files[0].record_end_time;

        const record = await getRecordURLs(meeting.meeting_record_id, tmUserId);
        const p = record.record_files.map(async file => {
          // Only interested in records that we don't already have.
          const transcriptId = file.record_file_id;
          if (await Summary.count({
            where: {
              transcriptId,
              summaryKey: crudeSummaryKey,
            }
          }) > 0) {
            console.log(`Ignoring existing crude summaries for transcript "${transcriptId}"`)
            return;
          }

          file.meeting_summary?.filter(summary => summary.file_type === 'txt')
            .map(summary => {
              ret.push({
                groupId,
                startedAt: startTime,
                endedAt: endTime,
                transcriptId,
                url: summary.download_address,
              });
            })
        });
        await Promise.all(p);
      })
    promises.push(promise);
  }
  await Promise.all(promises);
  return ret;
}
