import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { InterviewType, zInterviewType } from "../../shared/InterviewType";
import sequelizeInstance from "../database/sequelizeInstance";
import { createGroup, updateGroup } from "./groups";
import { generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import { zCalibration } from "../../shared/Calibration";
import { calibrationAttributes, includeForInterview, interviewAttributes
} from "../database/models/attributesAndIncludes";
import { Transaction } from "sequelize";
import invariant from "tiny-invariant";
import Calibration from "api/database/models/Calibration";
import { zInterview } from "../../shared/Interview";

const create = procedure
  .use(authUser("InterviewManager"))
  .input(z.object({
    type: zInterviewType,
    name: z.string(),
  }))
  .mutation(async ({ input }) =>
{
  await createCalibration(input.type, input.name);
})

/**
 * @returns the calibration id.
 */
export async function createCalibration(type: InterviewType, name: string): Promise<string> 
{
  if (!name.length) throw generalBadRequestError("名称不能为空");
  return await sequelizeInstance.transaction(async (transaction) => {
    const c = await db.Calibration.create({ type, name }, { transaction });
    await createGroup(null, [], null, null, c.id, transaction);
    return c.id;
  });
}

const list = procedure
  .use(authUser("InterviewManager"))
  .input(zInterviewType)
  .output(z.array(zCalibration))
  .query(async ({ input: type }) =>
{
  return await db.Calibration.findAll({
    where: { type },
    attributes: calibrationAttributes,
  })
});

const listMine = procedure
  .use(authUser())
  .output(z.array(zCalibration))
  .query(async ({ ctx }) =>
{
  const feedbacks = await db.InterviewFeedback.findAll({
    where: { interviewerId: ctx.user.id },
    include: [{
      model: db.Interview,
      attributes: [ "id" ],
      include: [{
        model: db.Calibration,
        attributes: calibrationAttributes,
      }]
    }]
  });

  const cs: Calibration[] = [];
  for (const f of feedbacks) {
    const fic = f.interview.calibration;
    if (!fic) continue;
    if (!cs.some(c => c.id == fic.id)) cs.push(fic);
  }

  return cs;
});

/**
 * Access is allowed only if the current user is one of the interviewers the calibration includes.
 * 
 * @param Calibration Id
 */
const getInterviews = procedure
  .use(authUser())
  .input(z.string())
  .output(z.array(zInterview))
  .query(async ({ ctx, input: calibrationId }) =>
{
  const interviews = await db.Interview.findAll({
    where: { calibrationId },
    attributes: interviewAttributes,
    include: includeForInterview,
  });

  if (!interviews.some(i => i.feedbacks.some(f => f.interviewer.id == ctx.user.id))) {
    throw noPermissionError("面试讨论组", calibrationId);
  }

  return interviews;
});

export default router({
  create,
  list,
  listMine,
  getInterviews,
});

export async function syncCalibrationGroup(calibrationId: string, transaction: Transaction) {
  const c = await db.Calibration.findByPk(calibrationId, {
    include: [db.Group, {
      model: db.Interview,
      attributes: interviewAttributes,
      include: includeForInterview,
    }],
    transaction,
  });
  
  if (!c) throw notFoundError("面试讨论组", calibrationId);
  invariant(c.interviews.every(i => i.type == c.type));

  const userIds: string[] = [];
  for (const i of c.interviews) {
    for (const f of i.feedbacks) {
      if (!userIds.includes(f.interviewer.id)) userIds.push(f.interviewer.id);
    }
  }

  await updateGroup(c.group.id, null, userIds, transaction);
}
