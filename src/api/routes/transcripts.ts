import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import DBTranscript from "../database/models/Transcript";
import Summary from "../database/models/Summary";
import Group from "../database/models/Group";
import User from "../database/models/User";
import { TRPCError } from "@trpc/server";
import { isPermitted } from "../../shared/Role";
import { zTranscript } from "shared/Transcript";

const get = procedure
    // We will throw access denied later if the user isn't a privileged user and isn't in the group.
  .use(authUser())
  .input(z.object({ id: z.string() }))
  .output(zTranscript)
  .query(async ({ input, ctx }) =>
{
  const t = await DBTranscript.findByPk(input.id, {
    include: [Summary, {
      model: Group,
      include: [{
        model: User,
        attributes: ['id', 'name'],
      }]
    }]
  });
  if (!t) {
    throw new TRPCError({ code: 'NOT_FOUND', message: `Transcript ${input.id} not found` });
  }
  if (!isPermitted(ctx.user.roles, 'SummaryEngineer') && !t.group.users.some(u => u.id === ctx.user.id )) {
    throw new TRPCError({ code: 'FORBIDDEN', message: `User has no access to Transcript ${input.id}` });
  }
  return t;
});

export default router({
  get,
});
