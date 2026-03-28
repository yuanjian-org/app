import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import {
  interviewFeedbackInclude,
  interviewFeedbackAttributes,
} from "../database/models/attributesAndIncludes";
import { conflictError, noPermissionError, notFoundError } from "../errors";
import {
  zFeedbackDeprecated,
  zInterviewFeedback,
} from "../../shared/InterviewFeedback";
import User from "../../shared/User";
import { isPermitted } from "../../shared/Role";
import moment from "moment";
import { getCalibrationAndCheckPermissionSafe } from "./calibrations";
import { isPermittedtoAccessMentee } from "./users";
import sequelize from "../database/sequelize";
import { Transaction } from "sequelize";

/**
 * Permissions of this route are the same as the `interviews.get` route.
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(
    z.object({
      interviewFeedback: zInterviewFeedback,
      etag: z.number(),
    }),
  )
  .query(async ({ ctx: { me }, input: id }) => {
    return await sequelize.transaction(async (t) => {
      const f = await getInterviewFeedbackImpl(
        id,
        me,
        /*allowOnlyInterviewer=*/ false,
        t,
      );
      return {
        interviewFeedback: f,
        etag: date2etag(f.feedbackUpdatedAt),
      };
    });
  });

export async function getInterviewFeedbackImpl(
  id: string,
  me: User,
  allowOnlyInterviewer: boolean,
  transaction: Transaction,
) {
  const f = await db.InterviewFeedback.findByPk(id, {
    attributes: [...interviewFeedbackAttributes, "interviewId"],
    include: [
      ...interviewFeedbackInclude,
      {
        // Include interview.interviewee.id for `isPermittedtoAccessMentee`
        // below.
        model: db.Interview,
        attributes: ["id"],
        include: [
          {
            association: "interviewee",
            attributes: ["id"],
          },
        ],
      },
    ],
    transaction,
  });
  if (!f) throw notFoundError("面试反馈", id);

  if (f.interviewer.id == me.id) return f;

  if (!allowOnlyInterviewer) {
    if (isPermitted(me.roles, "MentorshipManager")) return f;

    // Check if the user is a participant of the interview's calibration and the
    // calibration is active.
    const i = await db.Interview.findByPk(f.interviewId, {
      attributes: ["calibrationId"],
      transaction,
    });
    if (
      i?.calibrationId &&
      (await getCalibrationAndCheckPermissionSafe(
        me,
        i.calibrationId,
        transaction,
      ))
    ) {
      return f;
    }

    if (
      await isPermittedtoAccessMentee(
        me,
        f.interview.interviewee.id,
        transaction,
      )
    ) {
      return f;
    }
  }

  throw noPermissionError("面试反馈", id);
}

export function date2etag(feedbackUpdatedAt: string | Date | null) {
  return feedbackUpdatedAt ? moment(feedbackUpdatedAt).valueOf() : 0;
}

/**
 * Only the interviewer of the feedback are allowed to call this route.
 *
 * @return etag
 */
export async function updateInterviewFeedbackImpl(
  id: string,
  feedback: any,
  etag: number,
  me: User,
  transaction: Transaction,
) {
  const f = await getInterviewFeedbackImpl(
    id,
    me,
    /*allowOnlyInterviewer=*/ true,
    transaction,
  );

  if (date2etag(f.feedbackUpdatedAt) !== etag) {
    throw conflictError();
  }

  const now = new Date();
  await f.update(
    {
      feedback,
      feedbackUpdatedAt: now,
    },
    { transaction },
  );

  return date2etag(now);
}

/**
 * Only the interviewer of the feedback are allowed to call this route.
 *
 * @return etag
 */
const update = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.string(),
      feedback: zFeedbackDeprecated,
      etag: z.number(),
    }),
  )
  .output(z.number())
  .mutation(async ({ ctx: { me }, input }) => {
    return await sequelize.transaction(async (transaction) => {
      return await updateInterviewFeedbackImpl(
        input.id,
        input.feedback,
        input.etag,
        me,
        transaction,
      );
    });
  });

/**
 * Changelogging for auditing and data loss prevention.
 *
 * TODO: A holistic solution.
 */
const logUpdateAttempt = procedure
  .use(authUser())
  .input(
    z.object({
      id: z.string(),
      feedback: zFeedbackDeprecated,
      etag: z.number(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    await db.InterviewFeedbackUpdateAttempt.create({
      userId: me.id,
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
