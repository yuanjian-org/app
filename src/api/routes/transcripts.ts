import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { zTranscript } from "shared/Transcript";
import { notFoundError } from "api/errors";
import {
  groupAttributes,
  groupInclude,
  transcriptAttributes,
  summaryAttributes
} from "api/database/models/attributesAndIncludes";
import { checkPermissionForGroup } from "./groups";
import { Op } from "sequelize";
import Summary from "api/database/models/Summary";
import { zTranscriptNameMap, TranscriptNameMap } from "shared/Transcript";

const list = procedure
  .use(authUser())
  .input(z.object({
    groupId: z.string(),
  }))
  .output(z.array(zTranscript))
  .query(async ({ input: { groupId }, ctx }) =>
{
  const g = await db.Group.findByPk(groupId, {
    attributes: groupAttributes,
    include: [...groupInclude, {
      model: db.Transcript,
      attributes: transcriptAttributes,
    }],
  });

  if (!g) throw notFoundError("分组", groupId);

  checkPermissionForGroup(ctx.user, g);

  return g.transcripts;
});

/**
 * @return null if there is no transcript.
 */
const getMostRecentStartedAt = procedure
  .use(authUser(["MentorCoach", "MentorshipManager"]))
  .input(z.object({
    groupId: z.string(),
  }))
  .output(z.date().nullable())
  .query(async ({ input: { groupId } }) =>
{
  return await db.Transcript.max("startedAt", { where: { groupId } });
});

const getNameMap = procedure
  .use(authUser())
  .input(z.object({ transcriptId: z.string() }))
  .output(z.array(zTranscriptNameMap))
  .query(async ({ input }) =>
{
  const { nameMap } = await getSummariesAndNameMap(input.transcriptId);
  return [nameMap];
});

/**
 * @param { [handlebarNames]: userIds }
 */
const updateNameMap = procedure
  .use(authUser())
  .input(z.array(z.object({
    handlebarName: z.string(),
    userId: z.string(),
  })))
  .mutation(async ({ input: nameMap }) =>
{
  // Construct an array of objects to upsert multiple rows the same time
  const upsertArray = Object.entries(nameMap)
    .map(([handlebarName, userId]) => ({
      handlebarName,
      userId,
    }));

  await db.TranscriptNameMap.bulkCreate(upsertArray, { updateOnDuplicate: ['userId'] });
});

export default router({
  list,
  getMostRecentStartedAt,
  getNameMap,
  updateNameMap,
});

export async function getSummariesAndNameMap(transcriptId: string): Promise<{
  summaries: Summary[],
  nameMap: TranscriptNameMap,
}> {
  const summaries = await db.Summary.findAll({
    where: { transcriptId },
    attributes: summaryAttributes,
  });

  // find all handlebar from summaries under one transcript
  let handlebarsSet = new Set<string>();

  for (let s of summaries) {
    const matches = s.summary.match(/{{(.*?)}}/g);
    if (matches) {
      const extracted = matches.map(match => match.slice(2, -2));
      extracted.forEach(handlebar => handlebarsSet.add(handlebar));
    }
  }

  const tnm = await db.TranscriptNameMap.findAll({
    where: { handlebarName: [...handlebarsSet] },
    include: [{
      model: db.User,
      attributes: ['name'],
      where: { name: { [Op.ne]: null } } // Ensure user's name is not null
    }],
  });

  let nameMap: TranscriptNameMap = tnm;
  
  // check if the handlebar names are presented in the returned array of transcriptNameMap
  // if not, create an object of this handlebar with null user, 
  // otherwise when Handlebars.js compile it will return empty
  for (const handlebar of [...handlebarsSet]) {
    nameMap.forEach(nm => {
      if (nm.handlebarName !== handlebar) {
        nameMap.push({ handlebarName: handlebar, user: null });
      }
    });
  }

  return { summaries, nameMap };
}
