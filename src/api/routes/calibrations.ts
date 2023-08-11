import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { InterviewType, zInterviewType } from "../../shared/Interview";
import sequelizeInstance from "../database/sequelizeInstance";
import { createGroup, updateGroup } from "./groups";
import { generalBadRequestError, notFoundError } from "../errors";
import { zCalibration } from "../../shared/Calibration";
import { calibrationAttributes, includeForInterview, interviewAttributes
} from "../database/models/attributesAndIncludes";
import { Transaction } from "sequelize";
import invariant from "tiny-invariant";

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

export default router({
  create,
  list,
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
