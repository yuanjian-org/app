import { procedure, router } from "../trpc";
import { authIntegration, authUser } from "../auth";
import db from "../database/db";
import { 
  isValidMentorshipIds,
  zMentorship,
} from "../../shared/Mentorship";
import { z } from "zod";
import { alreadyExistsError, generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import sequelize from "../database/sequelize";
import { isPermitted } from "../../shared/Role";
import { 
  mentorshipAttributes,
  mentorshipInclude,
  minUserAttributes,
} from "api/database/models/attributesAndIncludes";
import { createGroup } from "./groups";
import invariant from "tiny-invariant";
import { Op } from "sequelize";
import { formatUserName } from "shared/strings";
import { isPermittedForMentee } from "./users";

const create = procedure
  .use(authUser('MenteeManager'))
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
      mentorship = await db.Mentorship.create({
        mentorId, menteeId
      }, { transaction });
    } catch (e: any) {
      if ('name' in e && e.name === "SequelizeUniqueConstraintError") {
        throw alreadyExistsError("一对一匹配");
      }
    }

    // Create groups
    invariant(mentorship);
    await createGroup(null, [mentorId, menteeId], mentorship.id, null, null,
      null, transaction);
  });
});

const update = procedure
  .use(authUser('MenteeManager'))
  .input(z.object({
    mentorshipId: z.string(),
    endedAt: z.string().nullable(),
  }))
  .mutation(async ({ input: { mentorshipId, endedAt } }) => 
{
  const m = await db.Mentorship.findByPk(mentorshipId);
  if (!m) throw notFoundError("一对一匹配", mentorshipId);
  await m.update({ endedAt });
});

/**
 * If the current user is a MentorCoach, return all mentorships of the mentee.
 * Otherwise, return only the mentorship of the mentee where the current user
 * is the mentor.
 */
const listForMentee = procedure
  .use(authUser())
  .input(z.string())
  .output(z.array(zMentorship))
  .query(async ({ ctx, input: menteeId }) => 
{
  return await db.Mentorship.findAll({
    where: {
      menteeId,
      ...isPermitted(ctx.user.roles, "MentorCoach") ? {} : {
        mentorId: ctx.user.id
      }
    },
    attributes: mentorshipAttributes,
    include: mentorshipInclude,
  });
});

/**
 * Omit mentorships that are already ended.
 */
const listMineAsCoach = procedure
  .use(authUser())
  .output(z.array(zMentorship))
  .query(async ({ ctx }) =>
{
  return (await db.User.findAll({ 
    where: { coachId: ctx.user.id },
    attributes: [],
    include: [{
      association: "mentorshipsAsMentor",
      where: { endedAt: { [Op.eq]: null } },
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
    }]
  })).map(u => u.mentorshipsAsMentor).flat();
});

/**
 * Usage:
 *
 * $ curl -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" "${BASE_URL}/api/v1/mentorships.countMentorships"
 *
 */
const countMentorships = procedure
  .use(authIntegration())
  .output(z.array(z.object({
    mentor: z.string(),
    count: z.number(),
  })))
  .query(async () => 
{
  return (await db.User.findAll({ 
    attributes: minUserAttributes,
    include: [{
      association: "mentorshipsAsMentor",
      where: { endedAt: { [Op.eq]: null } },
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
    }]
  })).map(u => ({
    mentor: formatUserName(u.name),
    count: u.mentorshipsAsMentor.length,
  }));
});

const listMineAsMentor = procedure
  .use(authUser())
  .output(z.array(zMentorship))
  .query(async ({ ctx }) => 
{
  return await db.Mentorship.findAll({
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
  .output(zMentorship)
  .query(async ({ ctx, input: id }) => 
{
  const res = await db.Mentorship.findByPk(id, {
    attributes: mentorshipAttributes,
    include: mentorshipInclude,
  });
  if (!res || !await isPermittedForMentee(ctx.user, res.mentee.id)) {
    throw noPermissionError("一对一匹配", id);
  }
  return res;
});

export default router({
  create,
  get,
  update,
  listMineAsMentor,
  listMineAsCoach,
  listForMentee,
  countMentorships,
});
