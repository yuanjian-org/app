import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { InterviewType, zInterview, zInterviewType } from "../../shared/Interview";
import { includeForInterview, interviewAttributes } from "../database/models/attributesAndIncludes";
import sequelizeInstance from "../database/sequelizeInstance";
import { generalBadRequestError, notFoundError } from "../errors";
import invariant from "tiny-invariant";
import { createGroup, updateGroup } from "./groups";
import { formatUserName } from "../../shared/strings";
import Group from "../database/models/Group";

const list = procedure
  .use(authUser("InterviewManager"))
  .input(zInterviewType)
  .output(z.array(zInterview))
  .query(async ({ input: type }) =>
{
  return await db.Interview.findAll({
    where: { type, },
    attributes: interviewAttributes,
    include: includeForInterview,
  })
});

const create = procedure
  .use(authUser("InterviewManager"))
  .input(z.object({
    type: zInterviewType,
    intervieweeId: z.string(),
    interviewerIds: z.array(z.string()),
  }))
  .mutation(async ({ input }) =>
{
  await createInterview(input.type, input.intervieweeId, input.interviewerIds);
})

/**
 * @returns the interview id.
 */
export async function createInterview(type: InterviewType, intervieweeId: string, interviewerIds: string[]):
  Promise<string> 
{
  validate(intervieweeId, interviewerIds);

  return await sequelizeInstance.transaction(async (transaction) => {
    const i = await db.Interview.create({
      type: type,
      intervieweeId: intervieweeId,
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
      u.save({ transaction });
    }

    await createGroup([intervieweeId, ...interviewerIds], null, i.id, transaction);

    return i.id;
  });
}

const update = procedure
  .use(authUser("InterviewManager"))
  .input(z.object({
    id: z.string(),
    type: zInterviewType,
    intervieweeId: z.string(),
    interviewerIds: z.array(z.string()),
  }))
  .mutation(async ({ input }) =>
{
  await updateInterview(input.id, input.type, input.intervieweeId, input.interviewerIds);
})

export async function updateInterview(id: string, type: InterviewType, intervieweeId: string, interviewerIds: string[]) 
{
  validate(intervieweeId, interviewerIds);

  const i = await db.Interview.findByPk(id, {
    include: [...includeForInterview, Group],
  });
  if (!i) {
    throw notFoundError("面试", id);
  }
  if (type !== i.type) {
    throw generalBadRequestError("面试类型错误");
  }
  if (intervieweeId !== i.intervieweeId && i.feedbacks.some(f => f.feedbackCreatedAt != null)) {
    throw generalBadRequestError("面试反馈已经递交，无法更改候选人");
  }
  for (const f of i.feedbacks) {
    if (f.feedbackCreatedAt && !interviewerIds.includes(f.interviewer.id)) {
      throw generalBadRequestError(`面试官${formatUserName(f.interviewer.name, "formal")}已经递交反馈，无法移出`);
    }
  }

  await sequelizeInstance.transaction(async (transaction) => {
    // Update interviwee
    await i.update({ intervieweeId }, { transaction });
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
        });
      }
    }
    // Update roles
    for (const interviwerId of interviewerIds) {
      const u = await db.User.findByPk(interviwerId);
      invariant(u);
      if (u.roles.some(r => r == "Interviewer")) continue;
      u.roles = [...u.roles, "Interviewer"];
      u.save({ transaction });
    }
    // Update group
    await updateGroup(i.group.id, null, [intervieweeId, ...interviewerIds], transaction);
  });
}

function validate(intervieweeId: string, interviewerIds: string[]) {
  if (interviewerIds.some(id => id === intervieweeId)) {
    throw generalBadRequestError("面试官和候选人不能是同一人");
  }
}

export default router({
  list,
  create,
  update,
});
