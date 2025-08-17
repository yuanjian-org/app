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
  summaryAttributes,
} from "api/database/models/attributesAndIncludes";
import { checkPermissionForGroupHistory } from "./groups";
import Summary from "api/database/models/Summary";

const list = procedure
  .use(authUser())
  .input(
    z.object({
      groupId: z.string(),
    }),
  )
  .output(z.array(zTranscript))
  .query(async ({ input: { groupId }, ctx }) => {
    const g = await db.Group.findByPk(groupId, {
      attributes: groupAttributes,
      include: [
        ...groupInclude,
        {
          model: db.Transcript,
          attributes: transcriptAttributes,
        },
      ],
    });

    if (!g) throw notFoundError("分组", groupId);

    checkPermissionForGroupHistory(ctx.user, g);

    return g.transcripts;
  });

export default router({
  list,
});

export async function getSummaries(transcriptId: string): Promise<Summary[]> {
  return await db.Summary.findAll({
    where: { transcriptId },
    attributes: summaryAttributes,
  });
}
