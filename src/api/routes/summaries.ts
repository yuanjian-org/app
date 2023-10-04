import { procedure, router } from "../trpc";
import { authIntegration, authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { getRecordURLs, listRecords } from "../TencentMeeting";
import invariant from "tiny-invariant";
import { TRPCError } from "@trpc/server";
import { safeDecodeMeetingSubject } from "./meetings";
import apiEnv from "api/apiEnv";
import { groupAttributes, groupInclude, summaryAttributes } from "api/database/models/attributesAndIncludes";
import { zSummary } from "shared/Summary";
import { notFoundError } from "api/errors";
import { checkPermissionForGroup } from "./groups";
import Handlebars from "handlebars";
import { Op } from "sequelize";

const crudeSummaryKey = "原始文字";

export interface CrudeSummaryDescriptor {
  groupId: string,
  transcriptId: string,
  startedAt: number,
  endedAt: number,
  url: string,
};

/**
 * See docs/Summarization.md for details.
 * 
 * @param excludeTranscriptsWithKey If specified, exclude summaries for the transcripts that already have summaries
 * identified by this key.
 * 
 * TODO: rename function to something like listRawTranscripts, hardcode key to use raw transcript's summary key.
 */
const listForIntegration = procedure
  .use(authIntegration())
  .input(z.object({
    key: z.string(),
    excludeTranscriptsWithKey: z.string().optional(),
  }))
  .output(z.array(zSummary))
  .query(async ({ input }) => 
{
  // TODO: Optimize and use a single query to return final results.
  const summaries = await db.Summary.findAll({ 
    where: { 
      summaryKey: input.key,
    },
    attributes: summaryAttributes,
  });

  const skippedTranscriptIds = !input.excludeTranscriptsWithKey ? [] : (await db.Summary.findAll({
    where: { summaryKey: input.excludeTranscriptsWithKey },
    attributes: ['transcriptId'],
  })).map(s => s.transcriptId);

  return summaries.filter(s => !skippedTranscriptIds.includes(s.transcriptId));
});

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
    }, {
      model: db.Summary,
      attributes: summaryAttributes,
    }]
  });

  if (!t) throw notFoundError("会议转录", transcriptId);

  checkPermissionForGroup(ctx.user, t.group);

  const handlebars = await extractHandlebars(transcriptId);
  const nameMap = await createNameMap(handlebars);
  
  // using Handlebars.js to compile and return summaries with handlebar replaced
  for (let summary of t.summaries) {
    summary.summary = Handlebars.compile(summary.summary)(nameMap);
  }

  return t.summaries;
});

/**
* See docs/Summarization.md for details.
 */
const write = procedure
  .use(authIntegration())
  .input(zSummary)
  .mutation(async ({ input }) => 
{
  if (input.summaryKey === crudeSummaryKey) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Summaries with key "${crudeSummaryKey}" are read-only`,
    });
  }
  // By design, this statement fails if the transcript doesn't exist.
  await db.Summary.upsert({
    transcriptId: input.transcriptId,
    summaryKey: input.summaryKey,
    summary: input.summary,
  });
});

export default router({
  list: listForIntegration,
  listToBeRenamed: list,  // TODO: rename to `list`
  write,
});

export async function saveCrudeSummary(meta: CrudeSummaryDescriptor, summary: string) {
  // `upsert` not `insert` because the system may fail after inserting the transcript row and before inserting the 
  // summary.
  await db.Transcript.upsert({
    transcriptId: meta.transcriptId,
    groupId: meta.groupId,
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
  });
  await db.Summary.create({
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
  for (const tmUserId of apiEnv.TM_USER_IDS) {
    const promises = (await listRecords(tmUserId))
      // Only interested in meetings that are ready to download.
      .filter(meeting => meeting.state === 3)
      .map(async meeting => {
        // Only interested in meetings that refers to valid groups.
        const groupId = safeDecodeMeetingSubject(meeting.subject);
        if (!groupId || !(await db.Group.count({ where: { id: groupId } }))) {
          console.log(`Ignoring invalid meeting subject or non-existing group "${meeting.subject}"`);
          return;
        }

        if (!meeting.record_files) return;
        invariant(meeting.record_files.length == 1);
        const startTime = meeting.record_files[0].record_start_time;
        const endTime = meeting.record_files[0].record_end_time;

        const record = await getRecordURLs(meeting.meeting_record_id, tmUserId);
        const promises = record.record_files.map(async file => {
          // Only interested in records that we don't already have.
          const transcriptId = file.record_file_id;
          if (await db.Summary.count({
            where: {
              transcriptId,
              summaryKey: crudeSummaryKey,
            }
          }) > 0) {
            console.log(`Ignoring existing crude summaries for transcript "${transcriptId}"`);
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
            });
        });
        await Promise.all(promises);
      });
    await Promise.all(promises);
  }
  return ret;
}

export async function extractHandlebars(transcriptId: string): Promise<string[]> {
  const summaries = await db.Summary.findAll({ where: { transcriptId } });

  // find all handlebar from summaries under one transcript
  let handlebars: string[] = [];
  for (let s of summaries) {
    const matches = s.summary.match(/{{(.*?)}}/g);
    if (matches) {
      // Extract matched handlebars and append to the existing handlebars
      const extractedHandlebars = matches.map(match => match.slice(2, -2).trim());
      // Remove duplicates
      for (const extracted of extractedHandlebars) {
        if (!handlebars.includes(extracted)) {
          handlebars.push(extracted);
        }
      }
    }
  }
  return handlebars;
}

export async function createNameMap(handlebars: string[]): Promise<Record<string, string>> {
  let nameMap: Record<string, string> = {};
  // create a list of namemap of itself, otherwise when Handlebars.js compile it will return empty
  for (const handlebar of handlebars) {
    nameMap[handlebar] = handlebar;
  }

  const snm = await db.SummaryNameMapping.findAll({
    where: { handlebarName: handlebars },
    include: [{
      model: db.User,
      attributes: ['name'],
      where: { name: { [Op.ne]: null } } // Ensure user's name is not null
    }],
  });

  for (const nm of snm) {
    invariant(nm.user.name);
    nameMap[nm.handlebarName] = nm.user.name;
  }

  return nameMap;
}
