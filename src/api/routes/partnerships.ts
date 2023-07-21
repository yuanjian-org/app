import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "../database/db";
import { 
  zPartnership,
  zPartnershipCountingAssessments, 
  zPartnershipWithAssessments, 
  zPartnershipWithGroupAndNotes, 
  zPrivateMentorNotes } from "../../shared/Partnership";
import { z } from "zod";
import Assessment from "../database/models/Assessment";
import { alreadyExistsError, generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import sequelizeInstance from "../database/sequelizeInstance";
import { isPermitted } from "../../shared/Role";
import Group from "api/database/models/Group";
import { 
  defaultAttributesForPartnership,
  includeForGroup,
  includeForPartnership } from "api/database/models/attributesAndIncludes";
import { createGroup } from "./groups";
import invariant from "tiny-invariant";

const create = procedure
  .use(authUser('PartnershipManager'))
  .input(z.object({
    mentorId: z.string().uuid(),
    menteeId: z.string().uuid(),
  }))
  .mutation(async ({ input }) => 
{
  await sequelizeInstance.transaction(async (t) => {
    const mentor = await db.User.findByPk(input.mentorId, { lock: true, transaction: t });
    const mentee = await db.User.findByPk(input.menteeId, { lock: true, transaction: t });
    if (mentor == null || mentee == null || mentor.id === mentee.id) {
      throw generalBadRequestError('无效用户ID');
    }

    // Assign appropriate roles.
    mentor.roles = [...mentor.roles.filter(r => r != "Mentor"), "Mentor"];
    mentor.save({ transaction: t });
    mentee.roles = [...mentee.roles.filter(r => r != "Mentee"), "Mentee"];
    mentee.save({ transaction: t });

    let partnership;
    try {
      partnership = await db.Partnership.create({
        mentorId: mentor.id,
        menteeId: mentee.id,
      }, { transaction: t });
    } catch (e: any) {
      if ('name' in e && e.name === "SequelizeUniqueConstraintError") {
        throw alreadyExistsError("一对一匹配");
      }
    }

    // Create the group
    invariant(partnership);
    await createGroup([input.mentorId, input.menteeId], partnership.id, t);
  });
});

const list = procedure
  .use(authUser('PartnershipManager'))
  .output(z.array(zPartnershipCountingAssessments))
  .query(async () => 
{
  const res = await db.Partnership.findAll({
    attributes: defaultAttributesForPartnership,
    include: [
      ...includeForPartnership,
      {
        model: Assessment,
        attributes: ['id'],
      }
    ]
  });
  return res;
});

const listMineAsMentor = procedure
  .use(authUser())
  .output(z.array(zPartnership))
  .query(async ({ ctx }) => 
{
  return await db.Partnership.findAll({
    where: { mentorId: ctx.user.id },
    attributes: defaultAttributesForPartnership,
    include: includeForPartnership,
  });
});

/**
 * Get all information of a partnership including private notes.
 * Only accessible by the mentor
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zPartnershipWithGroupAndNotes)
  .query(async ({ ctx, input: id }) => 
{
  const res = await db.Partnership.findByPk(id, {
    include: [...includeForPartnership, {
      model: Group,
      include: includeForGroup,
    }],
  });
  if (!res || res.mentorId !== ctx.user.id) {
    throw noPermissionError("一对一匹配", id);
  }
  return res;
});

// TODO: remove this function. Use partnership.get + assessments.listAllOfPartnership instead.
const getWithAssessmentsDeprecated = procedure
  .use(authUser())
  .input(z.string())
  .output(zPartnershipWithAssessments)
  .query(async ({ ctx, input: id }) =>
{
  const res = await db.Partnership.findByPk(id, {
    attributes: defaultAttributesForPartnership,
    include: [
      ...includeForPartnership,
      Assessment,
    ]
  });
  if (!res) throw notFoundError("一对一匹配", id);

  // Only assessors and mentors can access the partnership.
  if (!isPermitted(ctx.user.roles, 'PartnershipAssessor') && res.mentorId !== ctx.user.id) {
    throw noPermissionError("一对一匹配", id);
  }

  return res;
});

const update = procedure
  .use(authUser())
  .input(z.object({
    id: z.string(),
    privateMentorNotes: zPrivateMentorNotes,
  }))
  .mutation(async ({ ctx, input }) => 
{
  const partnership = await db.Partnership.findByPk(input.id);
  if (!partnership || partnership.mentorId !== ctx.user.id) {
    throw noPermissionError("一对一匹配", input.id);
  }

  partnership.privateMentorNotes = input.privateMentorNotes;
  partnership.save();
});

export default router({
  create,
  get,
  getWithAssessmentsDeprecated,
  list,
  listMineAsMentor,
  update,
});
