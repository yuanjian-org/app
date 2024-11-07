import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { zInterview, zInterviewWithGroup } from "../../shared/Interview";
import {
  groupAttributes,
  groupInclude,
  interviewInclude,
  interviewAttributes,
  userAttributes,
  userInclude
} from "../database/models/attributesAndIncludes";
import sequelize from "../database/sequelize";
import {
  conflictError, generalBadRequestError, noPermissionError, notFoundError 
} from "../errors";
import invariant from "tiny-invariant";
import { createGroup, updateGroup } from "./groups";
import { formatUserName } from "../../shared/strings";
import Group from "../database/models/Group";
import {
  getCalibrationAndCheckPermissionSafe, syncCalibrationGroup 
} from "./calibrations";
import { InterviewType, zInterviewType } from "../../shared/InterviewType";
import { isPermitted } from "../../shared/Role";
import { date2etag } from "./interviewFeedbacks";
import { zFeedbackDeprecated } from "../../shared/InterviewFeedback";
import { isPermittedForMentee } from "./users";
import { zInterviewerPreference, zUser } from "../../shared/User";

/**
 * Only MentorshipManager, interviewers of the interview, users allowed by 
 * `getCalibrationAndCheckPermissionSafe` and `isPermittedForMentee` are allowed
 * to call this route.
 */
const get = procedure
  .use(authUser())
  .input(z.object({
    interviewId: z.string()
  }))
  .output(z.object({
    interviewWithGroup: zInterviewWithGroup,
    etag: z.number(),
  }))
  .query(async ({ ctx, input: { interviewId } }) =>
{
  const i = await db.Interview.findByPk(interviewId, {
    attributes: [...interviewAttributes, "calibrationId", "decisionUpdatedAt"],
    include: [...interviewInclude, {
      model: Group,
      attributes: groupAttributes,
      include: groupInclude,
    }],
  });
  if (!i) throw notFoundError("面试", interviewId);

  const ret = {
    interviewWithGroup: i,
    etag: date2etag(i.decisionUpdatedAt),
  };

  const me = ctx.user;
  if (isPermitted(me.roles, "MentorshipManager")) return ret;

  if (i.feedbacks.some(f => f.interviewer.id === me.id)) return ret;

  if (i.calibrationId && await getCalibrationAndCheckPermissionSafe(me,
    i.calibrationId)) return ret;

  if (!await isPermittedForMentee(me, i.interviewee.id)) return ret;

  throw noPermissionError("面试", interviewId);
});

const getIdForMentee = procedure
  .use(authUser())
  .input(z.object({
    menteeId: z.string()
  }))
  .output(z.string().nullable())
  .query(async ({ input: { menteeId } }) =>
{
  // Define a variable to enforce type safety
  const type: InterviewType = "MenteeInterview";
  const i = await db.Interview.findOne({
    where: {
      intervieweeId: menteeId,
      type,
    },
    attributes: ["id"],
  });
  return i ? i.id : null;
});

const list = procedure
  .use(authUser("MentorshipManager"))
  .input(zInterviewType)
  .output(z.array(zInterview))
  .query(async ({ input: type }) =>
{
  return (await db.Interview.findAll({
    where: { type },
    attributes: interviewAttributes,
    include: interviewInclude,
  }))
  // Only return mentees whose status is 待审.
  // TOOD: optimize query to filter interviews at the DB level.
  .filter(i => i.type == "MentorInterview" ||
    i.interviewee.menteeStatus === null);
});

const listMine = procedure
  .use(authUser())
  .output(z.array(zInterview))
  .query(async ({ ctx }) =>
{
  return (await db.InterviewFeedback.findAll({
    where: { interviewerId: ctx.user.id },
    attributes: [],
    include: [{
      model: db.Interview,
      attributes: interviewAttributes,
      include: interviewInclude
    }]
  })).map(feedback => feedback.interview)
  // Only return mentees whose status is 待审.
  // TOOD: optimize query to filter interviews at the DB level.
  .filter(i => i.type == "MentorInterview" ||
    i.interviewee.menteeStatus === null);
});

/**
 * @returns the interview id.
 */
const create = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    type: zInterviewType,
    calibrationId: z.string().nullable(),
    intervieweeId: z.string(),
    interviewerIds: z.array(z.string()),
  }))
  .output(z.string())
  .mutation(async ({ input }) =>
{
  return await createInterview(input.type, input.calibrationId, input.intervieweeId, input.interviewerIds);
});

/**
 * @returns the interview id.
 */
export async function createInterview(type: InterviewType, calibrationId: string | null, 
  intervieweeId: string, interviewerIds: string[]
): Promise<string> {
  validate(intervieweeId, interviewerIds);

  return await sequelize.transaction(async transaction => {
    const i = await db.Interview.create({
      type, intervieweeId, calibrationId,
    }, { transaction });
    await db.InterviewFeedback.bulkCreate(interviewerIds.map(id => ({
      interviewId: i.id,
      interviewerId: id,
    })), { transaction });

    // Update roles
    for (const interviwerId of interviewerIds) {
      const u = await db.User.findByPk(interviwerId);
      invariant(u);
      if (u.roles.some(r => r == "Interviewer")) continue;
      u.roles = [...u.roles, "Interviewer"];
      await u.save({ transaction });
    }

    await createGroup(null, [intervieweeId, ...interviewerIds], null, i.id, null, null, transaction);

    if (calibrationId) await syncCalibrationGroup(calibrationId, transaction);

    return i.id;
  });
}

const listInterviewerStats = procedure
.use(authUser("MentorshipManager"))
.output(z.array(z.object({
  user: zUser,
  interviews: z.number(),
  limit: zInterviewerPreference.shape.limit,
})))
.query(async () =>
{
  const users = await db.User.findAll({
    attributes: [...userAttributes, 'preference'],
    include: userInclude,
  });

  // A map from user to the total number of interviews conducted by the user.
  const user2interviews = (await db.InterviewFeedback.findAll({
    attributes: [
      'interviewerId',
      [sequelize.fn('COUNT', sequelize.col('interviewerId')), 'count']
    ],
    group: ['interviewerId']
  })).reduce<{ [key: string]: number }>((acc, curr) => {
      acc[curr.interviewerId] = Number.parseInt(curr.getDataValue('count'));
      return acc;
    }, {});

  const stats = users
    .filter(user => user2interviews[user.id] 
      || user.preference?.interviewer?.optIn === true
      || user.roles.includes("Mentor") || user.roles.includes("MentorCoach"))
    .map(user => ({
      user,
      interviews: user2interviews[user.id] || 0,
      limit: user.preference?.interviewer?.limit, 
    }));

  stats.sort((a, b) => a.interviews - b.interviews);
  return stats;
});

const update = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    id: z.string(),
    type: zInterviewType,
    calibrationId: z.string().nullable(),
    intervieweeId: z.string(),
    interviewerIds: z.array(z.string()),
  }))
  .mutation(async ({ input }) =>
{
  await updateInterview(input.id, input.type, input.calibrationId, input.intervieweeId, input.interviewerIds);
});

/**
 * @return etag
 */
const updateDecision = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    interviewId: z.string(),
    decision: zFeedbackDeprecated,
    etag: z.number(),
  }))
  .output(z.number())
  .mutation(async ({ input }) =>
{
  return await sequelize.transaction(async transaction => {
    const i = await db.Interview.findByPk(input.interviewId, {
      attributes: ["id", "decisionUpdatedAt"],
      transaction,
      lock: true,
    });
    if (!i) throw notFoundError("面试", input.interviewId);
    if (date2etag(i.decisionUpdatedAt) !== input.etag) throw conflictError();

    i.decision = input.decision;
    const now = new Date();
    await i.update({
      decision: input.decision,
      decisionUpdatedAt: now,
    }, { transaction });
    return date2etag(now);
  });
});

export async function updateInterview(id: string, type: InterviewType, calibrationId: string | null,
  intervieweeId: string, interviewerIds: string[]) 
{
  validate(intervieweeId, interviewerIds);

  await sequelize.transaction(async transaction => {
    const i = await db.Interview.findByPk(id, {
      include: [...interviewInclude, Group],
      transaction
    });

    if (!i) {
      throw notFoundError("面试", id);
    }
    if (type !== i.type) {
      throw generalBadRequestError("面试类型错误");
    }
    if (intervieweeId !== i.intervieweeId && i.feedbacks.some(f => f.feedbackUpdatedAt != null)) {
      throw generalBadRequestError("面试反馈已经递交，无法更改候选人");
    }
    for (const f of i.feedbacks) {
      if (f.feedbackUpdatedAt && !interviewerIds.includes(f.interviewer.id)) {
        throw generalBadRequestError(`面试官${formatUserName(f.interviewer.name)}已经递交反馈，无法移除`);
      }
    }

    // Update interviwee
    const oldCalibrationId = i.calibrationId;
    await i.update({ intervieweeId, calibrationId }, { transaction });
    // Remove interviwers
    for (const f of i.feedbacks) {
      if (!interviewerIds.includes(f.interviewer.id)) {
        await f.destroy({ transaction });
      }
    }
    // Add interviewers
    for (const ir of interviewerIds) {
      if (!i.feedbacks.some(f => ir === f.interviewer.id)) {
        await db.InterviewFeedback.create({
          interviewId: i.id,
          interviewerId: ir,
        }, { transaction });
      }
    }
    // Update roles
    for (const interviwerId of interviewerIds) {
      const u = await db.User.findByPk(interviwerId, { transaction });
      invariant(u);
      if (u.roles.some(r => r == "Interviewer")) continue;
      u.roles = [...u.roles, "Interviewer"];
      await u.save({ transaction });
    }
    // Update group
    await updateGroup(i.group.id, null, i.group.public, 
      [intervieweeId, ...interviewerIds], transaction);
    // Update calibration. When the interviwer list is updated, the calibration group needs an update, too.
    if (calibrationId) await syncCalibrationGroup(calibrationId, transaction);
    if (oldCalibrationId && oldCalibrationId !== calibrationId) {
      await syncCalibrationGroup(oldCalibrationId, transaction);
    }
  });
}

function validate(intervieweeId: string, interviewerIds: string[]) {
  if (interviewerIds.some(id => id === intervieweeId)) {
    throw generalBadRequestError("面试官和候选人不能是同一人");
  }
}

export default router({
  get,
  getIdForMentee,
  list,
  listMine,
  create,
  listInterviewerStats,
  update,
  updateDecision,
});
