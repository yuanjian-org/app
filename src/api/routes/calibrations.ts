import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { InterviewType, zInterviewType } from "../../shared/InterviewType";
import sequelizeInstance from "../database/sequelizeInstance";
import { createGroup, updateGroup } from "./groups";
import { generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import { zCalibration } from "../../shared/Calibration";
import { calibrationAttributes, includeForGroup, includeForInterview, interviewAttributes, groupAttributes, includeForCalibration
} from "../database/models/attributesAndIncludes";
import { Transaction } from "sequelize";
import invariant from "tiny-invariant";
import Calibration from "api/database/models/Calibration";
import { zInterview } from "../../shared/Interview";
import Role, { isPermitted } from "../../shared/Role";
import User from "../../shared/User";

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
    const c = await db.Calibration.create({ type, name, active: false }, { transaction });
    await createGroup(null, [], null, null, c.id, transaction);
    return c.id;
  });
}

const update = procedure
  .use(authUser("InterviewManager"))
  .input(z.object({
    id: z.string(),
    name: z.string(),
    active: z.boolean(),
  }))
  .mutation(async ({ input }) =>
{
  const [affected] = await db.Calibration.update({
    name: input.name,
    active: input.active,
  }, {
    where: { id: input.id },
  });

  invariant(affected <= 1);
  if (!affected) throw notFoundError("面试讨论", input.id);
})

const list = procedure
  .use(authUser("InterviewManager"))
  .input(zInterviewType)
  .output(z.array(zCalibration))
  .query(async ({ input: type }) =>
{
  return await db.Calibration.findAll({
    where: { type },
    attributes: calibrationAttributes,
    include: includeForCalibration,
  })
});

const listMine = procedure
  .use(authUser())
  .output(z.array(zCalibration))
  .query(async ({ ctx }) =>
{
  const cids = (await db.Calibration.findAll({
    attributes: ["id"],
    where: {
      active: true,
    },
  })).map(c => c.id);

  const cs: Calibration[] = [];
  for (const cid of cids) {
    const c = await getCalibrationAndCheckPermissionSafe(ctx.user, cid);
    if (c) cs.push(c);
  }
  return cs;
});

/**
 * See `checkPermission` on access control.
 * 
 * TODO: return zCaibrationWithInterview and merge with getInterviews?
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zCalibration)
  .query(async ({ ctx, input: id }) =>
{
  return await getCalibrationAndCheckPermission(ctx.user, id);
});

/**
 * See `checkCalibrationPermission` on access control.
 * 
 * @param Calibration id
 * 
 * TODO: merge into `get` which should return zCaibrationWithInterview?
 */
const getInterviews = procedure
  .use(authUser())
  .input(z.string())
  .output(z.array(zInterview))
  .query(async ({ ctx, input: calibrationId }) =>
{
  const _ = await getCalibrationAndCheckPermission(ctx.user, calibrationId);

  return await db.Interview.findAll({
    where: { calibrationId },
    attributes: interviewAttributes,
    include: includeForInterview,
  });
});

export default router({
  create,
  update,
  list,
  listMine,
  get,
  getInterviews,
});

async function getCalibrationAndCheckPermission(me: User, calibrationId: string):
  Promise<Calibration>
{
  const c = await getCalibrationAndCheckPermissionSafe(me, calibrationId);
  if (!c) throw noPermissionError("面试讨论", calibrationId);
  return c;
}

/**
 * Only InterviewManagers and participants of the calibration are allowed. In the latter case, the calibration
 * must be active.
 * 
 * @return the calibration if access is allowed. null otherwise
 * 
 * TODO: optimize queries. combine queries from the call site.
 */
export async function getCalibrationAndCheckPermissionSafe(me: User, calibrationId: string):
  Promise<Calibration | null>
{
  const c = await db.Calibration.findByPk(calibrationId, {
    attributes: calibrationAttributes,
    include: [{
      model: db.Group,
      attributes: groupAttributes,
      include: includeForGroup,
    }]
  });
  if (!c) throw notFoundError("面试讨论", calibrationId);

  if (isPermitted(me.roles, "InterviewManager")) return c;

  if (!c.active) return null;

  const g = await db.Group.findOne({
    where: { calibrationId: calibrationId },
    include: [{
      model: db.User,
      attributes: [],
      where: { id: me.id },
    }],
  });
  if (!g) return null;

  return c;
}

export async function syncCalibrationGroup(calibrationId: string, transaction: Transaction) {
  const c = await db.Calibration.findByPk(calibrationId, {
    include: [db.Group, {
      model: db.Interview,
      attributes: interviewAttributes,
      include: includeForInterview,
    }],
    transaction,
  });
  
  if (!c) throw notFoundError("面试讨论", calibrationId);
  invariant(c.interviews.every(i => i.type == c.type));

  const userIds: string[] = [];
  for (const i of c.interviews) {
    for (const f of i.feedbacks) {
      if (!userIds.includes(f.interviewer.id)) userIds.push(f.interviewer.id);
    }
  }

  await updateGroup(c.group.id, null, userIds, transaction);
}
