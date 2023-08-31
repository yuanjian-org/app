import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { zTranscript } from "shared/Transcript";
import { notFoundError } from "api/errors";
import { groupAttributes, groupInclude, transcriptAttributes } from "api/database/models/attributesAndIncludes";
import { checkPermissionForGroup } from "./groups";

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
  .input(z.string())
  .output(z.array(zTranscript))
  .query(async ({ input: groupId, ctx }) =>
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


export default router({
  get,
  list,
});
