import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import db from "../database/db";
import { 
  isValidMentorshipIds,
  zMentorship,
} from "../../shared/Mentorship";
import { z } from "zod";
import { alreadyExistsError, generalBadRequestError, noPermissionError } from "../errors";
import sequelize from "../database/sequelize";
import { isPermitted } from "../../shared/Role";
import { 
  mentorshipAttributes,
  mentorshipInclude,
} from "api/database/models/attributesAndIncludes";
import { createGroup } from "./groups";
import invariant from "tiny-invariant";

const create = procedure
  .use(authUser('MentorshipManager'))
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
    await createGroup(null, [mentorId, menteeId], [], mentorship.id, null, null, null, transaction);
  });
});

const list = procedure
  .use(authUser('MentorshipManager'))
  .output(z.array(zMentorship))
  .query(async () => 
{
  return await db.Mentorship.findAll({ 
    attributes: mentorshipAttributes,
    include: mentorshipInclude,
  });
});

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
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
    }]
  })).map(u => u.mentorshipsAsMentor).flat();
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
  if (!res || (res.mentor.id !== ctx.user.id && !isPermitted(ctx.user.roles, "MentorCoach"))) {
    throw noPermissionError("一对一匹配", id);
  }
  return res;
});

export default router({
  create,
  get,
  list,
  listMineAsMentor,
  listMineAsCoach,
});
