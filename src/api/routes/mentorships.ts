import { procedure, router } from "../trpc";
import { authIntegration, authUser } from "../auth";
import db from "../database/db";
import {
  isEndedTransactionalMentorship,
  isValidMentorshipIds,
  zMentorship,
} from "../../shared/Mentorship";
import { z } from "zod";
import {
  alreadyExistsError, generalBadRequestError, noPermissionError, notFoundError
} from "../errors";
import sequelize from "../database/sequelize";
import Role, { isPermitted } from "../../shared/Role";
import {
  mentorshipAttributes,
  mentorshipInclude,
  minUserAttributes,
  userAttributes,
  userInclude,
} from "../database/models/attributesAndIncludes";
import { createGroup } from "./groups";
import invariant from "tiny-invariant";
import { Op } from "sequelize";
import { compareChinese, formatUserName } from "../../shared/strings";
import { isPermittedtoAccessMentee } from "./users";
import {
  zMentorPreference, zUser
} from "../../shared/User";
import { zUserProfile } from "../../shared/UserProfile";
import { zNullableDateColumn } from "../../shared/DateColumn";

export const whereMentorshipIsOngoing = {
  [Op.or]: [
    { endsAt: null },
    { endsAt: { [Op.gt]: new Date() } }
  ]
};

const create = procedure
  .use(authUser('MentorshipManager'))
  .input(z.object({
    mentorId: z.string(),
    menteeId: z.string(),
    transactional: z.boolean(),
    endsAt: zNullableDateColumn,
  }))
  .mutation(async ({ input: { mentorId, menteeId, transactional, endsAt } }) => 
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
        mentorId, menteeId, transactional, endsAt
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
  .use(authUser('MentorshipManager'))
  .input(z.object({
    mentorshipId: z.string(),
    transactional: z.boolean(),
    endsAt: zNullableDateColumn,
  }))
  .mutation(async ({ input: { mentorshipId, transactional, endsAt } }) => 
{
  await sequelize.transaction(async transaction => {
    const m = await db.Mentorship.findByPk(mentorshipId, { transaction });
    if (!m) throw notFoundError("一对一匹配", mentorshipId);
    await m.update({ transactional, endsAt }, { transaction });
  });
});

/**
 * If the current user is a MentorCoach or MentorshipManager, return all
 * mentorships of the mentee. Otherwise, return only the mentorship of the
 * mentee where the current user is the mentor.
 */
const listMentorshipsForMentee = procedure
  .use(authUser())
  .input(z.object({
    menteeId: z.string(),
    includeEndedTransactional: z.boolean(),
  }))
  .output(z.array(zMentorship))
  .query(async ({ ctx: { user }, input: { menteeId, includeEndedTransactional } }) => 
{
  const isPrivileged = isPermitted(user.roles, ["MentorCoach",
    "MentorshipManager"]);

  return (await db.Mentorship.findAll({
    where: {
      menteeId,
      ...isPrivileged ? {} : { mentorId: user.id }
    },
    attributes: mentorshipAttributes,
    include: mentorshipInclude,
  })).filter(m =>
    includeEndedTransactional || !isEndedTransactionalMentorship(m));
});

/**
 * Omit mentorships that are already ended.
 */
const listMyMentorshipsAsCoach = procedure
  .use(authUser())
  .output(z.array(zMentorship))
  .query(async ({ ctx }) =>
{
  return (await db.User.findAll({ 
    where: { coachId: ctx.user.id },
    attributes: [],
    include: [{
      association: "mentorshipsAsMentor",
      where: { endsAt: { [Op.eq]: null } },
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
    }]
  })).map(u => u.mentorshipsAsMentor).flat();
});

/**
 * Return a map from user to the number of mentorships of this user as a mentor
 */
export async function getUser2MentorshipCount() {
  return (await db.Mentorship.findAll({
    where: { endsAt: null },
    attributes: [
      'mentorId',
      [sequelize.fn('COUNT', sequelize.col('mentorId')), 'count']
    ],
    group: ['mentorId']
  })).reduce<{ [key: string]: number }>((acc, cur) => {
    acc[cur.mentorId] = Number.parseInt(cur.getDataValue('count'));
    return acc;
  }, {});
}

const listMentorStats = procedure
  .use(authUser("MentorshipManager"))
  .output(z.array(z.object({
    user: zUser,
    mentorships: z.number(),
    preference: zMentorPreference,
    profile: zUserProfile,
  })))
  .query(async () =>
{
  // Force type check
  const mentorRole: Role = "Mentor";
  const users = await db.User.findAll({
    where: { roles: { [Op.contains]: [mentorRole] } },
    attributes: [...userAttributes, "profile", "preference"],
    include: userInclude,
  });

  const user2mentorships = await getUser2MentorshipCount();
  const ret = users.map(u => ({
      user: u,
      mentorships: user2mentorships[u.id] ?? 0,
      preference: u.preference?.mentor ?? {},
      profile: u.profile ?? {},
    }));

  ret.sort((a, b) => compareChinese(a.user.name, b.user.name));
  return ret;
});

/**
 * Usage:
 *
 * $ curl -H "Authorization: Bearer ${INTEGRATION_AUTH_TOKEN}" \
 *  "${BASE_URL}/api/v1/mentorships.countMentorships"
 */
const deprecatedCountMentorships = procedure
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
      where: { endsAt: { [Op.eq]: null } },
      attributes: mentorshipAttributes,
      include: mentorshipInclude,
    }]
  })).map(u => ({
    mentor: formatUserName(u.name),
    count: u.mentorshipsAsMentor.length,
  }));
});

const listMyMentorshipsAsMentor = procedure
  .use(authUser())
  .output(z.array(zMentorship))
  .query(async ({ ctx }) => 
{
  return (await db.Mentorship.findAll({
    where: { mentorId: ctx.user.id },
    attributes: mentorshipAttributes,
    include: mentorshipInclude,
  })).filter(m => !isEndedTransactionalMentorship(m));
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
  if (!res || !await isPermittedtoAccessMentee(ctx.user, res.mentee.id)) {
    throw noPermissionError("一对一匹配", id);
  }
  return res;
});

export default router({
  create,
  get,
  update,
  listMyMentorshipsAsMentor,
  listMyMentorshipsAsCoach,
  listMentorshipsForMentee,
  listMentorStats,
  countMentorships: deprecatedCountMentorships,
});
