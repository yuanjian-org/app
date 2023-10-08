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
import invariant from 'tiny-invariant';
import { Op } from "sequelize";
import Summary from "api/database/models/Summary";

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

const getNameMap = procedure
  .use(authUser())
  .input(z.object({ transcriptId: z.string() }))
  .output(z.record(z.string()))
  .query(async ({ input }) => 
{
  const { nameMap } = await getSummariesAndNameMap(input.transcriptId);
  return nameMap;
});

/**
 * @param { [handlebarNames]: userIds }
 */
const updateNameMap = procedure
  .use(authUser())
  .input(z.record(z.string()))
  .mutation(async ({ input: nameMap }) => 
{
  // Construct an array of objects to upsert multiple rows the same time
  const upsertArray = Object.entries(nameMap)
    .map(([handlebarName, userId]) => ({
      handlebarName,
      userId,
    }));

  await db.SummaryNameMapping.bulkCreate(upsertArray, { updateOnDuplicate: ['userId'] });
});

export default router({
  list,
  getNameMap,
  updateNameMap
});

export async function getSummariesAndNameMap(transcriptId: string): Promise<{
  summaries: Summary[],
  nameMap: Record<string, string>,
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

  const nameMap: Record<string, string> = {};
  // create a list of namemap of itself, otherwise when Handlebars.js compile it will return empty
  for (const handlebar of [...handlebarsSet]) {
    nameMap[handlebar] = `**${handlebar}**`;
  }

  const snm = await db.SummaryNameMapping.findAll({
    where: { handlebarName: [...handlebarsSet] },
    include: [{
      model: db.User,
      attributes: ['name'],
      where: { name: { [Op.ne]: null } } // Ensure user's name is not null
    }],
  });

  for (const nm of snm) {
    invariant(nm.user.name);
    nameMap[nm.handlebarName] = `**${nm.user.name}**`;
  }

  return { summaries, nameMap };
}
