import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { getFileAddresses, listRecords } from "../TencentMeeting";
import { safeDecodeMeetingSubject } from "./meetings";
import apiEnv from "api/apiEnv";
import { groupAttributes, groupInclude, summaryAttributes } from "api/database/models/attributesAndIncludes";
import { zSummary } from "shared/Summary";
import { notFoundError } from "api/errors";
import { checkPermissionForGroupHistory } from "./groups";
import axios from "axios";
import formatMeetingMinutes from "./formatMeetingMinutes";

const AI_MINUTES_SUMMARY_KEY = "智能纪要";

export interface SummaryDescriptor {
  groupId: string,
  transcriptId: string,
  summaryKey: string,
  startedAt: number,
  endedAt: number,
  url: string,
};

const list = procedure
  .use(authUser())
  .input(z.string())
  .output(z.array(zSummary))
  .query(async ({ ctx, input: transcriptId }) => 
{
  const t = await db.Transcript.findByPk(transcriptId, {
    attributes: ["transcriptId"],
    include: [{
      model: db.Group,
      attributes: groupAttributes,
      include: groupInclude,
    }]
  });

  if (!t) throw notFoundError("会议转录", transcriptId);

  checkPermissionForGroupHistory(ctx.user, t.group);

  return db.Summary.findAll({
    where: { transcriptId },
    attributes: summaryAttributes,
  });
});

export default router({
  list,
});

/**
 * Download summaries from Tencent Meeting and save them locally.
 *
 * @returns the transcriptIds of synced transcripts.
 */
export const syncSummaries = procedure
  .output(z.object({
    syncedSummaries: z.array(z.string()),
  }))
  .mutation(async () => 
{
  console.log('Looking for missing summaries...');
  const summaries = await findMissingSummaries();

  await Promise.all(summaries.map(async (summary) => {
    console.log(`Downloading ${summary.transcriptId}...`);
    const res = await axios.get(summary.url);
    await saveSummary(summary, res.data);
  }));

  return {
    syncedSummaries: summaries.map((t: any) => t.transcriptId),
  };
});

async function saveSummary(desc: SummaryDescriptor, summary: string) 
{
  const formatted = desc.summaryKey == AI_MINUTES_SUMMARY_KEY ?
    formatMeetingMinutes(summary) : summary;

  await db.Transcript.upsert({
    transcriptId: desc.transcriptId,
    groupId: desc.groupId,
    startedAt: desc.startedAt,
    endedAt: desc.endedAt,
  });
  await db.Summary.create({
    transcriptId: desc.transcriptId,
    summaryKey: desc.summaryKey,
    summary: formatted,
  });  
}

/**
 * Returns summaries that 1) were created in the last 31 days (max query
 * range allowed by Tencent), and 2) don't exist locally.
 * 
 * Note: URLs returned from Tencent API are valid only for a short period of time.
 */
async function findMissingSummaries(): Promise<SummaryDescriptor[]>
{
  const descs: SummaryDescriptor[] = [];
  for (const tmUserId of apiEnv.TM_USER_IDS) {
    await findMissingCrudeSummariesforTmUser(tmUserId, descs);
  }
  return descs;
}

async function findMissingCrudeSummariesforTmUser(tmUserId: string,
  descs: SummaryDescriptor[]) 
{
  await Promise.all((await listRecords(tmUserId))
    // Only interested in meetings that are ready to download.
    .filter(meeting => meeting.state === 3)
    .map(async meeting => {
      // Only interested in meetings that refers to valid groups.
      const groupId = safeDecodeMeetingSubject(meeting.subject);
      if (!groupId || !(await db.Group.count({ where: { id: groupId } }))) {
        console.log(`Ignoring invalid meeting subject or non-existing group` +
          ` "${meeting.subject}"`);
        return;
      }

      if (!meeting.record_files) return;

      // Have start and end times cover all record files.
      let startedAt = Number.MAX_VALUE;
      let endedAt = Number.MIN_VALUE;
      for (const file of meeting.record_files) {
        startedAt = Math.min(startedAt, file.record_start_time);
        endedAt = Math.max(endedAt, file.record_end_time);
      }

      await Promise.all(meeting.record_files.map(async file => {
        const transcriptId = file.record_file_id;
        const addrs = await getFileAddresses(file.record_file_id, tmUserId);

        if (!await hasSummary(transcriptId, AI_MINUTES_SUMMARY_KEY) && 
          addrs.ai_minutes) {
          addrs.ai_minutes
          .filter(addr => addr.file_type == "txt")
          .map(addr => descs.push({
            groupId,
            transcriptId,
            summaryKey: AI_MINUTES_SUMMARY_KEY,
            url: addr.download_address,
            startedAt,
            endedAt,
          }));
        }
      }));
    }));
}

async function hasSummary(transcriptId: string, summaryKey: string) {
  const ret = await db.Summary.count({
    where: { transcriptId, summaryKey, }
  }) > 0;
  if (ret) {
    console.log(`Ignoring existing ${summaryKey} summary for transcript` +
      ` "${transcriptId}"`);
  }
  return ret;
}
