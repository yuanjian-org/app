import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { includeForInterviewFeedback, interviewFeedbackAttributes } from "../database/models/attributesAndIncludes";
import { conflictError, noPermissionError, notFoundError } from "../errors";
import { zFeedback, zInterviewFeedback } from "shared/InterviewFeedback";
import User from "../../shared/User";
import { isPermitted } from "../../shared/Role";
import moment from "moment";

/**
 * Only InterviewManagers and the interviewer of a feedback are allowed to call this route.
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(z.object({
    interviewFeedback: zInterviewFeedback,
    etag: z.number(),
  }))
  .query(async ({ ctx, input: id }) =>
{
  const f = await getInterviewFeedback(id, ctx.user, /*allowInterviewManager=*/ true);
  return {
    interviewFeedback: f,
    etag: getEtag(f.feedbackUpdatedAt),
  }
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

function getEtag(feedbackUpdatedAt: any | null) {
  return feedbackUpdatedAt ? moment(feedbackUpdatedAt).unix() : 0;
}

/**
 * Only the interviewer of a feedback are allowed to call this route.
 * 
 * @return etag
 */
const update = procedure
  .use(authUser())
  .input(z.object({
    id: z.string(),
    feedback: zFeedback,
    etag: z.number(),
  }))
  .output(z.number())
  .mutation(async ({ ctx, input }) =>
{
  const f = await getInterviewFeedback(input.id, ctx.user, /*allowInterviewManager=*/ false);
  if (getEtag(f.feedbackUpdatedAt) !== input.etag) {
    throw conflictError();
  }

  const now = new Date();
  await f.update({
    feedback: input.feedback,
    feedbackUpdatedAt: now,
  });

  return getEtag(now);
});

/**
 * Changelogging for auditing and data loss prevention.
 *
 * TODO: A holistic solution.
 */
const logUpdateAttempt = procedure
  .use(authUser())
  .input(z.object({
    id: z.string(),
    feedback: zFeedback,
    etag: z.number(),
  }))
  .mutation(async ({ ctx, input }) =>
{
  await db.InterviewFeedbackUpdateAttempt.create({
    userId: ctx.user.id,
    interviewFeedbackId: input.id,
    feedback: input.feedback,
    etag: input.etag,
  });
});

export default router({
  get,
  update,
  logUpdateAttempt,
});
