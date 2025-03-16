import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { getFileAddresses, listRecords, getSpeakerStats } from "../TencentMeeting";
import apiEnv from "api/apiEnv";
import { groupAttributes, groupInclude, summaryAttributes } from "api/database/models/attributesAndIncludes";
import { zSummary } from "shared/Summary";
import { SpeakerStats } from 'api/TencentMeeting';
import { notFoundError } from "api/errors";
import { checkPermissionForGroupHistory } from "./groups";
import axios from "axios";
import formatMeetingMinutes from "./formatMeetingMinutes";
import { Op } from "sequelize";
import moment from "moment";

const AI_MINUTES_SUMMARY_KEY = "智能纪要";

export interface SummaryDescriptor {
  groupId: string,
  transcriptId: string,
  key: string,
  startedAt: number,
  endedAt: number,
  url: string,
  speakerStats: SpeakerStats,
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
 */
export async function downloadSummaries() {
  const summaries = await findMissingSummaries();
  await Promise.all(summaries.map(async (summary) => {
    console.log(`Downloading ${summary.transcriptId}...`);
    const res = await axios.get(summary.url);
    await saveSummary(summary, res.data);
  }));
}

async function saveSummary(desc: SummaryDescriptor, summary: string) 
{
  let formatted: string;
  if (desc.key == AI_MINUTES_SUMMARY_KEY) {
    formatted = formatSpeakerStats(desc.speakerStats) +
      formatMeetingMinutes(summary);
  } else {
    formatted = summary;
  }

  await db.Transcript.upsert({
    transcriptId: desc.transcriptId,
    groupId: desc.groupId,
    startedAt: desc.startedAt,
    endedAt: desc.endedAt,
  });
  await db.Summary.create({
    transcriptId: desc.transcriptId,
    key: desc.key,
    markdown: formatted,
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
  console.log('findMissingSummaries()...');
  const descs: SummaryDescriptor[] = [];
  for (const tmUserId of apiEnv.TM_USER_IDS) {
    await findMissingSummariesforTmUser(tmUserId, descs);
  }
  return descs;
}

async function findMissingSummariesforTmUser(tmUserId: string,
  descs: SummaryDescriptor[]) 
{
  await Promise.all((await listRecords(tmUserId))
    // Only interested in meetings that are ready to download.
    .filter(record => record.state === 3)
    .map(async record => {
      if (!record.record_files) return;

      // Have start and end times cover all record files.
      let startedAt = Number.MAX_VALUE;
      let endedAt = Number.MIN_VALUE;
      for (const file of record.record_files) {
        startedAt = Math.min(startedAt, file.record_start_time);
        endedAt = Math.max(endedAt, file.record_end_time);
      }

      console.log(
        "meeting_id", record.meeting_id, 
        "record_id", record.meeting_record_id, 
        "mins", moment(endedAt).diff(moment(startedAt), 'minutes'),
        "start", moment(startedAt).utcOffset(8).format(),
        "end", moment(endedAt).utcOffset(8).format());

      const history = await db.MeetingHistory.findOne({
        /**
         * We are only interested in records that fall into the time range
         * [meeting start time, meeting end time upper bound]. `createdAt`
         * indicates meeting start time.
         * 
         * This is needed to exclude records that are accidentally created 
         * outside of the platform. For example, one may copy the Tencent
         * meeting URL and reuse it later, bypassing the platform.
         * 
         * Since we don't know the exact end time of meetings, this filtering
         * method doesn't guarantee accuracy. It is better than nothing never
         * the less.
         * 
         * Note: We don't look at entries with null endedBefore only for
         * simplicity.
         */
        where: {
          [Op.and]: [
            { meetingId: record.meeting_id },
            { createdAt: { [Op.lte]: new Date(startedAt) } },
            { endedBefore: { [Op.gte]: new Date(endedAt) } },
          ],
        },
        attributes: ["groupId"],
      });

      if (!history) {
        console.log(`History not found for meeting_id ${record.meeting_id} ` +
          `record_id ${record.meeting_record_id}`);
        return;
      }

      await Promise.all(record.record_files.map(async file => {
        const transcriptId = file.record_file_id;
        const addrs = await getFileAddresses(file.record_file_id, tmUserId);

        if (!await hasSummary(transcriptId, AI_MINUTES_SUMMARY_KEY) && 
          addrs.ai_minutes) {
          const speakerStats = await getSpeakerStats(file.record_file_id, tmUserId);

          addrs.ai_minutes
            .filter(addr => addr.file_type == "txt")
            .map(addr => descs.push({
              groupId: history.groupId,
              transcriptId,
              key: AI_MINUTES_SUMMARY_KEY, 
              speakerStats,
              url: addr.download_address,
              startedAt,
              endedAt,
            }));
        }
      }));
    }));
}

async function hasSummary(transcriptId: string, key: string) {
  const ret = await db.Summary.count({
    where: { transcriptId, key, }
  }) > 0;
  if (ret) {
    console.log(`Ignoring existing ${key} summary for transcript` +
      ` "${transcriptId}"`);
  }
  return ret;
}

function formatSpeakerStats(stats: SpeakerStats) : string {
  if (stats.length == 0) return "";
  stats.sort((a, b) => b.totalTime - a.totalTime);
  return "发言时长（分钟)：" +
    stats.map(s => `${s.speakerName}：${s.totalTime}`).join('，') + "\n";
}
