import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { includeForInterviewFeedback, interviewFeedbackAttributes } from "../database/models/attributesAndIncludes";
import { noPermissionError, notFoundError } from "../errors";
import { zInterviewFeedback } from "shared/InterviewFeedback";

/**
 * Only the interviewer of a feedback is allowed to get it.
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zInterviewFeedback)
  .query(async ({ ctx, input: id }) =>
{
  const f = await db.InterviewFeedback.findByPk(id, {
    attributes: interviewFeedbackAttributes,
    include: includeForInterviewFeedback,
  });
  if (!f) {
    throw notFoundError("面试反馈", id);
  }
  if (f.interviewer.id !== ctx.user.id) {
    throw noPermissionError("面试反馈", id);
  }
  return f;
});

export default router({
  get,
});
