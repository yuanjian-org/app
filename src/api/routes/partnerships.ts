import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import _ from "lodash";
import db from "../database/db";
import { 
  isValidPartnershipIds,
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
  defaultPartnershipAttributes,
  groupAttributes,
  groupCountingTranscriptsInclude,
  partnershipInclude } from "api/database/models/attributesAndIncludes";
import { createGroup, updateGroup } from "./groups";
import invariant from "tiny-invariant";

const create = procedure
  .use(authUser('PartnershipManager'))
  .input(z.object({
    mentorId: z.string(),
    menteeId: z.string(),
    coachId: z.string(),
  }))
  .mutation(async ({ input: { mentorId, menteeId, coachId } }) => 
{
  if (!isValidPartnershipIds(menteeId, mentorId, coachId)) {
    throw generalBadRequestError('无效用户ID');
  }

  await sequelizeInstance.transaction(async (transaction) => {
    const mentor = await db.User.findByPk(mentorId, { lock: true, transaction });
    const mentee = await db.User.findByPk(menteeId, { lock: true, transaction });
    const coach = await db.User.findByPk(menteeId, { lock: true, transaction });
    if (!mentor || !mentee || !coach) {
      throw generalBadRequestError('无效用户ID');
    }

    // Assign appropriate roles.
    mentor.roles = [...mentor.roles.filter(r => r != "Mentor"), "Mentor"];
    await mentor.save({ transaction });
    mentee.roles = [...mentee.roles.filter(r => r != "Mentee"), "Mentee"];
    await mentee.save({ transaction });
    coach.roles = [...coach.roles.filter(r => r != "MentorCoach"), "MentorCoach"];
    await coach.save({ transaction });

    let partnership;
    try {
      partnership = await db.Partnership.create({
        mentorId, menteeId, coachId
      }, { transaction });
    } catch (e: any) {
      if ('name' in e && e.name === "SequelizeUniqueConstraintError") {
        throw alreadyExistsError("一对一匹配");
      }
    }

    // Create groups
    invariant(partnership);
    await createGroup(null, [mentorId, menteeId], [], partnership.id, null, null, null, transaction);
    await createGroup(null, [mentorId, coachId], [], null, null, null, partnership.id, transaction);
  });
});

const updateCoach = procedure
  .use(authUser('PartnershipManager'))
  .input(z.object({
    id: z.string(),
    coachId: z.string(),
  }))
  .mutation(async ({ input: { id, coachId } }) => 
{
  await sequelizeInstance.transaction(async (transaction) => {
    const p = await db.Partnership.findByPk(id, { lock: true, transaction });
    if (!p) throw notFoundError("一对一匹配", id);
    await p.update({ coachId }, { transaction });

    // Update role
    // TODO: Remove role from previous coach?
    const coach = await db.User.findByPk(coachId, { lock: true, transaction });
    if (!coach) throw notFoundError("用户", coachId);
    coach.roles = [...coach.roles.filter(r => r != "MentorCoach"), "MentorCoach"];
    await coach.save({ transaction });

    // Update group membership
    const group = await db.Group.findOne({
      where: { coachingPartnershipId: id },
      lock: true,
      transaction,
    });
    if (group) {
      await updateGroup(group.id, null, [p.mentorId, coachId], transaction);
    } else {
      // Backfill
      await createGroup(null, [p.mentorId, coachId], [], null, null, null, id, transaction);
    }
  });
});

const updatePrivateMentorNotes = procedure
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

const list = procedure
  .use(authUser('PartnershipManager'))
  .output(z.array(zPartnershipCountingAssessments))
  .query(async () => 
{
  const res = await db.Partnership.findAll({
    attributes: defaultPartnershipAttributes,
    include: [
      ...partnershipInclude,
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
    attributes: defaultPartnershipAttributes,
    include: partnershipInclude,
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
    include: [...partnershipInclude, {
      model: Group,
      attributes: groupAttributes,
      include: groupCountingTranscriptsInclude,
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
    attributes: defaultPartnershipAttributes,
    include: [
      ...partnershipInclude,
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

export default router({
  create,
  get,
  getWithAssessmentsDeprecated,
  list,
  listMineAsMentor,
  updateCoach,
  updatePrivateMentorNotes,
});
