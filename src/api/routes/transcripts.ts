import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { zTranscript } from "shared/Transcript";
import { notFoundError } from "api/errors";
import { groupAttributes, groupInclude, transcriptAttributes } from "api/database/models/attributesAndIncludes";
import { checkPermissionForGroup } from "./groups";
import sequelize from "api/database/sequelize";
import { extractHandlebars, createNameMap } from "./summaries";

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
    const handlebars = await extractHandlebars(transcriptId);
    return await createNameMap(handlebars);
  });

const updateNameMap = procedure
  .use(authUser())
  .input(z.record(z.string()))
  .mutation(async ({ input: nameMap }) => {
    await sequelize.transaction(async (transaction) => {
      // Construct an array of objects to upsert rows which userIds are not empty
      const upsertArray = Object.entries(nameMap)
        .map(([handlebarName, userId]) => ({
          handlebarName,
          userId,
        }));

      await db.SummaryNameMapping.bulkCreate(upsertArray, {
        updateOnDuplicate: ['userId'],
        transaction,
      });

    });
  });

export default router({
  get,
  list,
  getNameMap,
  updateNameMap
});
