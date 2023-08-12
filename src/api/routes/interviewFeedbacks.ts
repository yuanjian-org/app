import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { includeForInterviewFeedback, interviewFeedbackAttributes } from "../database/models/attributesAndIncludes";
import { noPermissionError, notFoundError } from "../errors";
import { zFeedback, zInterviewFeedback } from "shared/InterviewFeedback";
import User from "../../shared/User";
import { isPermitted } from "../../shared/Role";

/**
 * Only InterviewManagers and the interviewer of a feedback are allowed to call this route.
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zInterviewFeedback)
  .query(async ({ ctx, input: id }) =>
{
  return await getInterviewFeedback(id, ctx.user, /*allowInterviewManager=*/ true);
});

async function getInterviewFeedback(id: string, me: User, allowInterviewManager: boolean) {
  const f = await db.InterviewFeedback.findByPk(id, {
    attributes: interviewFeedbackAttributes,
    include: includeForInterviewFeedback,
  });
  if (!f) {
    throw notFoundError("面试反馈", id);
  }
  if (f.interviewer.id !== me.id && !(allowInterviewManager && isPermitted(me.roles, "InterviewManager"))) {
    throw noPermissionError("面试反馈", id);
  }
  return f;
}

/**
 * Only the interviewer of a feedback are allowed to call this route.
 */
const update = procedure
  .use(authUser())
  .input(z.object({
    id: z.string(),
    feedback: zFeedback,
  }))
  .mutation(async ({ ctx, input }) =>
{
  const f = await getInterviewFeedback(input.id, ctx.user, /*allowInterviewManager=*/ false);
  await f.update({
    feedback: input.feedback,
    feedbackUpdatedAt: new Date(),
  });
});

export default router({
  get,
  update,
});
