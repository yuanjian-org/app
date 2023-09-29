import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { zTranscript } from "shared/Transcript";
import { notFoundError } from "api/errors";
import { groupAttributes, groupInclude, transcriptAttributes } from "api/database/models/attributesAndIncludes";
import { checkPermissionForGroup } from "./groups";
import invariant from 'tiny-invariant';

const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zTranscript)
  .query(async ({ input: id, ctx }) =>
{
  const t = await db.Transcript.findByPk(id, {
    attributes: transcriptAttributes,
    include: [{
      model: db.Group,
      attributes: groupAttributes,
      include: groupInclude,
    }],
  });

  if (!t) throw notFoundError("会议转录", id);

  checkPermissionForGroup(ctx.user, t.group);

  return t;
});

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
  .input(z.string())
  .query(async ({ input: transcriptId }) => {

    const summaries = await db.Summary.findAll({ where: { transcriptId } });

    // find all handlebar from summaries under one transcript
    let handlebars: string[] = [];
    for (let s of summaries) {
      const matches = s.summary.match(/{{(.*?)}}/g);
      if (matches) {
        handlebars = [...handlebars, ...matches.map(match => match.slice(2, -2).trim())];
      }
    }

    let nameMap: Record<string, string> = {};
    // create a list of namemap of itself, otherwise when handlebars compile it will return empty
    nameMap = handlebars.reduce((o, key) => ({ ...o, [key]: key }), {});

    const tnm = await db.TranscriptNameMapping.findAll({
      where: { handlebarName: handlebars },
      include: [{
        model: db.User,
        attributes: ['name']
      }],
    });

    if (tnm) {
      for (const nm of tnm) {
        invariant(nm.user.name);
        nameMap[nm.handlebarName] = nm.user.name;
      }
    }

    return nameMap;

  });

const updateNameMap = procedure
  .use(authUser())
  .input(z.object({}).catchall(z.string()))
  .mutation(async ({ input: nameMap }) => {
    // Construct an array of objects to upsert
    const upsertArray = Object.entries(nameMap).map(([handlebarName, userId]) => ({
      handlebarName,
      userId,
    }));

    if (upsertArray.length > 0) {
      await db.TranscriptNameMapping.bulkCreate(upsertArray, {
        updateOnDuplicate: ['userId'], // specify the field(s) that should be updated on duplicate
      });
    }
  });

export default router({
  get,
  list,
  getNameMap,
  updateNameMap
});
