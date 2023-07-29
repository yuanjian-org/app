import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { includeForInterviewFeedback, interviewFeedbackAttributes } from "../database/models/attributesAndIncludes";
import { noPermissionError, notFoundError } from "../errors";
import { zFeedback, zInterviewFeedback } from "shared/InterviewFeedback";
import invariant from "tiny-invariant";

/**
 * Only the interviewer of a feedback is allowed to get it.
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zInterviewFeedback)
  .query(async ({ ctx, input: id }) =>
{
  return await getInterviewFeedback(id, ctx.user.id);
});

async function getInterviewFeedback(id: string, userId: string) {
  const f = await db.InterviewFeedback.findByPk(id, {
    attributes: interviewFeedbackAttributes,
    include: includeForInterviewFeedback,
  });
  if (!f) {
    throw notFoundError("面试反馈", id);
  }
  if (f.interviewer.id !== userId) {
    throw noPermissionError("面试反馈", id);
  }
  invariant(f);
  return f;
}

const update = procedure
  .use(authUser())
  .input(z.object({
    id: z.string(),
    feedback: zFeedback,
  }))
  .mutation(async ({ ctx, input }) => 
{
  const f = await getInterviewFeedback(input.id, ctx.user.id);
  await f.update({
    feedback: input.feedback,
    feedbackUpdatedAt: new Date(),
  });
});

export default router({
  get,
  update,
});
