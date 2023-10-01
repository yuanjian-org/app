import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { 
  isValidMentorshipIds,
  zMentorship,
  zMentorshipWithAssessmentsDeprecated, 
  zMentorshipWithGroupAndNotes, 
  zPrivateMentorNotes } from "../../shared/Mentorship";
import { z } from "zod";
import Assessment from "../database/models/Assessment";
import { alreadyExistsError, generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import sequelize from "../database/sequelize";
import { isPermitted } from "../../shared/Role";
import Group from "api/database/models/Group";
import { 
  mentorshipAttributes,
  groupAttributes,
  groupCountingTranscriptsInclude,
  mentorshipInclude, 
  mentorshipWithNotesAttributes,
  mentorshipWithGroupInclude,
} from "api/database/models/attributesAndIncludes";
import { createGroup } from "./groups";
import invariant from "tiny-invariant";

const create = procedure
  .use(authUser('PartnershipManager'))
  .input(z.object({
    mentorId: z.string(),
    menteeId: z.string(),
  }))
  .mutation(async ({ input: { mentorId, menteeId } }) => 
{
  if (!isValidMentorshipIds(menteeId, mentorId)) {
    throw generalBadRequestError('无效用户ID');
  }

  await sequelize.transaction(async transaction => {
    const mentor = await db.User.findByPk(mentorId, { lock: true, transaction });
    const mentee = await db.User.findByPk(menteeId, { lock: true, transaction });
    if (!mentor || !mentee) {
      throw generalBadRequestError('无效用户ID');
    }

    // Assign appropriate roles.
    mentor.roles = [...mentor.roles.filter(r => r != "Mentor"), "Mentor"];
    await mentor.save({ transaction });
    mentee.roles = [...mentee.roles.filter(r => r != "Mentee"), "Mentee"];
    await mentee.save({ transaction });

    let mentorship;
    try {
      mentorship = await db.Partnership.create({
        mentorId, menteeId
      }, { transaction });
    } catch (e: any) {
      if ('name' in e && e.name === "SequelizeUniqueConstraintError") {
        throw alreadyExistsError("一对一匹配");
      }
    }

    // Create groups
    invariant(mentorship);
    await createGroup(null, [mentorId, menteeId], [], mentorship.id, null, null, null, transaction);
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
  const m = await db.Partnership.findByPk(input.id);
  if (!m || m.mentor.id !== ctx.user.id) {
    throw noPermissionError("一对一匹配", input.id);
  }

  m.privateMentorNotes = input.privateMentorNotes;
  m.save();
});

const list = procedure
  .use(authUser('PartnershipManager'))
  .output(z.array(zMentorshipWithGroupAndNotes))
  .query(async () => 
{
  return await db.Partnership.findAll({ 
    attributes: mentorshipWithNotesAttributes,
    include: mentorshipWithGroupInclude,
  });
});

const listMineAsCoach = procedure
  .use(authUser())
  .output(z.array(zMentorshipWithGroupAndNotes))
  .query(async ({ ctx }) =>
{
  return (await db.User.findAll({ 
    where: { coachId: ctx.user.id },
    attributes: [],
    include: [{
      association: "mentorshipsAsMentor",
      attributes: mentorshipWithNotesAttributes,
      include: mentorshipWithGroupInclude,
    }]
  })).map(u => u.mentorshipsAsMentor).flat();
});

const listMineAsMentor = procedure
  .use(authUser())
  .output(z.array(zMentorship))
  .query(async ({ ctx }) => 
{
  return await db.Partnership.findAll({
    where: { mentorId: ctx.user.id },
    attributes: mentorshipAttributes,
    include: mentorshipInclude,
  });
});

/**
 * Get all information of a mentorship including private notes.
 * Only accessible by the mentor and mentor coaches
 */
const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zMentorshipWithGroupAndNotes)
  .query(async ({ ctx, input: id }) => 
{
  const res = await db.Partnership.findByPk(id, {
    attributes: mentorshipWithNotesAttributes,
    include: [...mentorshipInclude, {
      model: Group,
      attributes: groupAttributes,
      include: groupCountingTranscriptsInclude,
    }],
  });
  if (!res || (res.mentor.id !== ctx.user.id && !isPermitted(ctx.user.roles, "MentorCoach"))) {
    throw noPermissionError("一对一匹配", id);
  }
  return res;
});

// TODO: remove this function. Use mentorship.get + assessments.listAllForMentorship instead.
const getWithAssessmentsDeprecated = procedure
  .use(authUser())
  .input(z.string())
  .output(zMentorshipWithAssessmentsDeprecated)
  .query(async ({ ctx, input: id }) =>
{
  const res = await db.Partnership.findByPk(id, {
    attributes: mentorshipAttributes,
    include: [
      ...mentorshipInclude,
      Assessment,
    ]
  });
  if (!res) throw notFoundError("一对一匹配", id);

  // Only assessors and mentors can access the mentorship.
  if (!isPermitted(ctx.user.roles, 'PartnershipAssessor') && res.mentor.id !== ctx.user.id) {
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
  listMineAsCoach,
  updatePrivateMentorNotes,
});
