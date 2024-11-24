import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, { AllRoles, RoleProfiles, isPermitted, zRoles } from "../../shared/Role";
import db from "../database/db";
import { Op } from "sequelize";
import { authUser } from "../auth";
import User, { defaultMentorCapacity, isAcceptedMentee, zMinUser, zUser, zUserFilter, zUserPreference } from "../../shared/User";
import { isValidChineseName, toPinyin } from "../../shared/strings";
import invariant from 'tiny-invariant';
import { generalBadRequestError, noPermissionError, notFoundError } from "../errors";
import { zInterviewType } from "../../shared/InterviewType";
import { 
  minUserAttributes, 
  userAttributes,
  userInclude, 
} from "../database/models/attributesAndIncludes";
import { getCalibrationAndCheckPermissionSafe } from "./calibrations";
import sequelize from "../database/sequelize";
import { createGroup, updateGroup } from "./groups";
import { zMenteeStatus } from "../../shared/MenteeStatus";
import { zMinUserAndProfile, zUserProfile } from "../../shared/UserProfile";
import { zDateColumn } from "../../shared/DateColumn";
import { getUser2MentorshipCount } from "./mentorships";

const create = procedure
  .use(authUser('UserManager'))
  .input(z.object({
    name: z.string(),
    email: z.string(),
    roles: zRoles,
  }))
  .mutation(async ({ ctx, input }) => 
{
  checkUserFields(input.name, input.email);
  checkPermissionToManageRoles(ctx.user.roles, input.roles);
  await db.User.create({
    name: input.name,
    pinyin: toPinyin(input.name),
    email: input.email,
    roles: input.roles,
  });
});

/**
 * Returned users are ordered by Pinyin.
 */
const list = procedure
  .use(authUser(['UserManager', 'GroupManager', 'MentorshipManager']))
  .input(zUserFilter)
  .output(z.array(zUser))
  .query(async ({ input: filter }) =>
{
  // Declare a variable to force type checking.
  const banned: Role = "Banned";
  return await db.User.findAll({ 
    order: [['pinyin', 'ASC']],
    attributes: userAttributes,
    include: userInclude,

    where: {
      ...filter.includeBanned === true ? {} : {
        [Op.not]: { roles: { [Op.contains]: [banned] } }
      },

      ...filter.containsRoles === undefined ? {} : {
        [Op.and]: filter.containsRoles.map(r => ({
          roles: { [Op.contains]: [r] }
        }))
      },

      ...filter.menteeStatus === undefined ? {} : {
        menteeStatus: filter.menteeStatus
      },

      ...filter.hasMenteeApplication === undefined ? {} : {
        menteeApplication: { 
          ...filter.hasMenteeApplication ? { [Op.ne]: null } : { [Op.eq]: null }
        },
      },

      ...filter.matchesNameOrEmail === undefined ? {} : {
        [Op.or]: [
          { pinyin: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
          { name: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
          { email: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
        ],
      },
    },
  });
});

const listMentorProfiles = procedure
  .use(authUser())
  .output(z.array(zMinUserAndProfile.merge(z.object({
    matchable: z.boolean(),
  }))))
  .query(async ({ ctx: { user: me } }) =>
{
  if (!isPermitted(me.roles, ["Mentor", "MentorshipManager"]) &&
    !isAcceptedMentee(me.roles, me.menteeStatus, true)) {
    throw noPermissionError("导师");
  }

  // Force type check
  const mentorRole: Role = "Mentor";
  const users = await db.User.findAll({
    where: { roles: { [Op.contains]: [mentorRole] } },
    attributes: [...minUserAttributes, "roles", "preference", "profile"],
  });

  const user2mentorships = await getUser2MentorshipCount();

  return users.map(u => {
    const adhoc = u.roles.includes("AdhocMentor");
    const cap = adhoc ? 0 :
      (u.preference?.mentor?.最多匹配学生 ?? defaultMentorCapacity)
      - (user2mentorships[u.id] ?? 0);

    return {
      user: u,
      profile: u.profile ?? {},
      matchable: cap > 0,
    };
  });
});

const listVolunteerProfiles = procedure
  .use(authUser(["Volunteer"]))
  .output(z.array(zMinUserAndProfile.merge(z.object({
    updatedAt: zDateColumn
  }))))
  .query(async () =>
{
  // Force type check
  const volunteerRole: Role = "Volunteer";
  return (await db.User.findAll({
    where: { roles: { [Op.contains]: [volunteerRole] } },
    attributes: [...minUserAttributes, "roles", "profile", "updatedAt"],
  })).map(u => ({
    user: u,
    profile: u.profile ?? {},
    updatedAt: u.updatedAt,
  }));
});

const listRedactedEmailsWithSameName = procedure
  .use(authUser())
  .output(z.array(z.string()))
  .query(async ({ ctx }) =>
{
  // Force type check
  const banned: Role = "Banned";
  return (await db.User.findAll({
    where: {
      name: ctx.user.name,
      id: { [Op.ne]: ctx.user.id },
      [Op.not]: { roles: { [Op.contains]: [banned] }, },
    },
    attributes: ["email"],
  })).map(u => redactEmail(u.email));
});

/**
 * Given foo.bar@gmail.com, return f******@gmail.com
 */
export function redactEmail(email: string): string {
  return email.replace(/^(.)(.+)(@.*)$/,
    (match, first, rest, domain) => {
      return `${first}${'*'.repeat(rest.length)}${domain}`;
    }
  );
}

const update = procedure
  .use(authUser())
  .input(zUser)
  .mutation(async ({ input, ctx }) => 
{
  checkUserFields(input.name, input.email);

  const isUserManager = isPermitted(ctx.user.roles, 'UserManager');
  const isSelf = ctx.user.id === input.id;

  // Non-user-managers can only update their own profile.
  if (!isUserManager && !isSelf) {
    throw noPermissionError("用户", input.id);
  }

  const user = await db.User.findByPk(input.id);
  if (!user) {
    throw notFoundError("用户", input.id);
  }

  const rolesToAdd = input.roles.filter(r => !user.roles.includes(r));
  const rolesToRemove = user.roles.filter(r => !input.roles.includes(r));
  checkPermissionToManageRoles(ctx.user.roles,
    [...rolesToAdd, ...rolesToRemove]);

  invariant(input.name);
  await user.update({
    name: input.name,
    wechat: input.wechat,
    pinyin: toPinyin(input.name),
    consentFormAcceptedAt: input.consentFormAcceptedAt,

    // fields that only user managers can change
    ...isUserManager ? {
      roles: input.roles,
      email: input.email,
    } : {},
  });
});

const setUserPreference = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
    preference: zUserPreference,
  }))
  .mutation(async ({ ctx: { user }, input: { userId, preference } }) => 
{
  if (user.id !== userId && !isPermitted(user.roles, "UserManager")) {
    throw noPermissionError("用户", userId);
  }

  const [cnt] = await db.User.update({ preference }, {
    where: { id: userId }
  });
  if (cnt == 0) throw notFoundError("用户", userId);
});

const setMenteeStatus = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    userId: z.string(),
    menteeStatus: zMenteeStatus.nullable()
  }))
  .mutation(async ({ input: { userId, menteeStatus } }) => 
{
  const [cnt] = await db.User.update({ menteeStatus }, {
    where: { id: userId }
  });
  if (cnt == 0) throw notFoundError("用户", userId);
});

const isBanned = procedure
  .input(z.object({
    email: z.string()
  })).output(z.boolean())
  .query(async ({ input: { email } }) =>
{
  // Declare a variable to force type checking
  const banned: Role = "Banned";
  const count = await db.User.count({
    where: {
      email,
      roles: { [Op.contains]: [banned] },
    }
  });
  invariant(count <= 1);
  return count != 0;
});

const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zMinUser)
  .query(async ({ ctx: { user: me }, input: userId }) =>
{
  if (me.id !== userId && !isPermitted(me.roles, "UserManager") &&
    !await isPermittedtoAccessMentee(me, userId)) {
    throw noPermissionError("用户", userId);
  }

  const u = await db.User.findByPk(userId, {
    attributes: minUserAttributes,
  });

  if (!u) throw notFoundError("用户", userId);
  return u;
});

const getFull = procedure
  .use(authUser())
  .input(z.string())
  .output(zUser)
  .query(async ({ ctx: { user: me }, input: userId }) =>
{
  if (me.id !== userId && !isPermitted(me.roles, "UserManager")) {
    throw noPermissionError("用户", userId);
  }

  const u = await db.User.findByPk(userId, {
    attributes: userAttributes,
    include: userInclude,
  });

  if (!u) throw notFoundError("用户", userId);
  return u;
});

const getUserPreference = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
  }))
  .output(zUserPreference)
  .query(async ({ ctx: { user: me }, input: { userId } }) => 
{
  if (me.id !== userId && !isPermitted(me.roles, "UserManager")) {
    throw noPermissionError("用户", userId);
  }

  const user = await db.User.findByPk(userId, {
    attributes: ['preference'] 
  });

  if (!user) throw notFoundError("用户", userId);
  return user.preference || {};
});

const getUserProfile = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
  }))
  .output(zMinUserAndProfile)
  .query(async ({ ctx: { user: me }, input: { userId } }) => 
{
  const u = await db.User.findByPk(userId, {
    attributes: [...minUserAttributes, 'menteeStatus', 'roles', 'profile'] 
  });
  if (!u) throw notFoundError("用户", userId);

  /**
   * N.B. Update /who-can-see-my-data when changing permission here.
   */

  if (me.id !== userId &&

    // These roles can access profiles of all the users
    !isPermitted(me.roles, ["Mentor", "MentorshipManager", "UserManager"]) &&

    // Volunteers who are not in the roles above can only access other
    // volunteers profiles
    !(isPermitted(me.roles, "Volunteer") && isPermitted(u.roles, "Volunteer")) &&

    // Accepted mentoees can only access mentor profiles
    !(isAcceptedMentee(me.roles, me.menteeStatus, true) &&
      isPermitted(u.roles, "Mentor"))
  ) {
    throw noPermissionError("用户", userId);
  }

  return {
    user: u,
    profile: u.profile ?? {},
  };
});

const setUserProfile = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
    profile: zUserProfile,
  }))
  .mutation(async ({ ctx: { user }, input: { userId, profile } }) => 
{
  if (user.id !== userId && !isPermitted(user.roles, "UserManager")) {
    throw noPermissionError("用户", userId);
  }

  const [cnt] = await db.User.update({ profile }, { where: { id: userId } });
  if (cnt == 0) throw notFoundError("用户", userId);
});

/**
 * Only the user themselves, MentorCoach, and MentorshipManager have access.
 */
const getMentorCoach = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
  }))
  .output(zMinUser.nullable())
  .query(async ({ ctx, input: { userId } }) =>
{
  if (ctx.user.id !== userId && !isPermitted(ctx.user.roles,
    ["MentorCoach", "MentorshipManager"])) {
    throw noPermissionError("资深导师匹配", userId);
  }

  const u = await db.User.findByPk(userId, {
    attributes: [],
    include: [{
      association: "coach",
      attributes: minUserAttributes,
    }]
  });

  if (!u) throw notFoundError("用户", userId);
  return u.coach;
});

const setMentorCoach = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    userId: z.string(),
    coachId: z.string(),
  }))
  .mutation(async ({ input: { userId, coachId } }) =>
{
  await sequelize.transaction(async transaction => {
    const u = await db.User.findByPk(userId, {
      attributes: ["id", "coachId"],
      transaction,
      lock: true,
    });
    if (!u) throw notFoundError("用户", userId);
    const oldCoachId = u.coachId;
    await u.update({ coachId }, { transaction });

    // Update role
    // TODO: Remove role from previous coach?
    const coach = await db.User.findByPk(coachId, { lock: true, transaction });
    if (!coach) throw notFoundError("用户", coachId);
    coach.roles = [...coach.roles.filter(r => r != "MentorCoach"), "MentorCoach"];
    await coach.save({ transaction });

    // create or update group
    if (oldCoachId) {
      const gs = await db.Group.findAll({
        where: { coacheeId: userId },
        attributes: ["id", "public"],
      });
      invariant(gs.length == 1);
      await updateGroup(gs[0].id, null, gs[0].public, [userId, coachId],
          transaction);
    } else {
      await createGroup(null, [userId, coachId], null, null, null, userId,
        transaction);
    }
  });
});

const setPointOfContactAndNote = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    userId: z.string(),
    pocId: z.string().optional(),
    pocNote: z.string().optional(),
  }))
  .mutation(async ({ input: { userId, pocId, pocNote } }) =>
{
  if (pocId === undefined && pocNote === undefined) {
    throw generalBadRequestError("One of pocId and pocNote must be set");
  }

  const [cnt] = await db.User.update({
    ...pocId !== undefined ? { pointOfContactId: pocId } : {},
    ...pocNote !== undefined ? { pointOfContactNote: pocNote } : {},
  }, { where: { id: userId } });
  if (cnt == 0) throw notFoundError("用户", userId);
});

/**
 * Only MentorshipManager, MentorCoach, mentor of the applicant, interviewers
 * of the applicant, and participants of the calibration (only if the calibration
 * is active) are allowed to call this route.
 * 
 * If the user is not an MentorshipManager, contact information is redacted.
 */
const getApplicant = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
    type: zInterviewType,
  }))
  .output(z.object({
    user: zUser,
    sex: z.string().nullable(),
    application: z.record(z.string(), z.any()).nullable(),
  }))
  .query(async ({ ctx, input: { userId, type } }) =>
{
  const isMentee = type == "MenteeInterview";

  const user = await db.User.findByPk(userId, {
    attributes: [
      ...userAttributes, 
      isMentee ? "menteeApplication" : "volunteerApplication",
      "profile"
    ],
    include: userInclude,
  });
  if (!user) throw notFoundError("用户", userId);

  const application = isMentee ? user.menteeApplication : user.volunteerApplication;
  const sex = user.profile?.性别 ?? null;

  const ret = {
    user,
    application,
    sex,
  };

  if (isPermitted(ctx.user.roles, "MentorshipManager")) return ret;

  // Redact
  user.email = "redacted@redacted.com";
  user.wechat = "redacted";

  // Check if the user is a mentorcoach or mentor of the mentee
  if (isMentee && await isPermittedtoAccessMentee(ctx.user, userId)) return ret;

  // Check if the user is an interviewer
  const myInterviews = await db.Interview.findAll({
    where: {
      type,
      intervieweeId: userId,
    },
    attributes: [],
    include: [{
      model: db.InterviewFeedback,
      attributes: [],
      where: { interviewerId: ctx.user.id },
    }],
  });
  if (myInterviews.length) return ret;

  // Check if the user is a calibration participant
  const allInterviews = await db.Interview.findAll({
    where: {
      type: type,
      intervieweeId: userId,
    },
    attributes: ["calibrationId"],
  });
  for (const i of allInterviews) {
    if (i.calibrationId && await getCalibrationAndCheckPermissionSafe(
      ctx.user, i.calibrationId)) return ret;
  }

  throw noPermissionError("申请表", user.id);
});

/**
 * TODO: Support etag. Refer to `interviewFeedbacks.update`.
 */
const setApplication = procedure
  .use(authUser("MentorshipManager"))
  .input(z.object({
    userId: z.string(),
    type: zInterviewType,
    application: z.record(z.string(), z.any()),
  }))
  .mutation(async ({ input }) =>
{
  const [cnt] = await db.User.update({
    [input.type == "MenteeInterview" ?
      "menteeApplication" : "volunteerApplication"]: input.application,
  }, { where: { id: input.userId } });
  if (!cnt) throw notFoundError("用户", input.userId);
});

/**
 * List all users and their roles who have privileged user data access.
 * See RoleProfile.privilegeUserDataAccess for an explanation.
 */
const listPriviledgedUserDataAccess = procedure
  .use(authUser())
  .output(z.array(z.object({
    name: z.string().nullable(),
    roles: zRoles,
  })))
  .query(async () => 
{
  return await db.User.findAll({ 
    // TODO: Optimize with postgres `?|` operator
    where: {
      [Op.or]: AllRoles.filter(
        r => RoleProfiles[r].privilegedUserDataAccess
      ).map(r => ({
        roles: { [Op.contains]: [r] }
      })),
    },
    attributes: ['name', 'roles'],
  });
});

const destroy = procedure
  .use(authUser("UserManager"))
  .input(z.object({
    id: z.string(),
  }))
  .mutation(async ({ input }) => 
{
  await sequelize.transaction(async transaction => {
    const user = await db.User.findByPk(input.id, { transaction });
    if (!user) throw notFoundError("用户", input.id);

    // Because we soft-delete a user, rename the user's email address before
    // destroying to make sure next time the user logs in with the same email,
    // account creation will not fail.
    let i = 0;
    while (true) {
      const email = `deleted-${i++}+${user.email}`;
      if (!await db.User.findOne({
        where: { email }, 
        paranoid: false,
        transaction,
      })) {
        await user.update({ email }, { transaction });
        await user.destroy({ transaction });
        break;
      }
    }
  });
});

export default router({
  isBanned,
  create,
  get,
  getFull,
  list,
  listPriviledgedUserDataAccess,
  listRedactedEmailsWithSameName,
  listVolunteerProfiles,
  listMentorProfiles,

  update,
  setMenteeStatus,
  destroy,

  getApplicant,
  setApplication,

  getUserProfile,
  setUserProfile,

  getMentorCoach,
  setMentorCoach,

  setUserPreference,
  getUserPreference,

  setPointOfContactAndNote,
  
});

function checkUserFields(name: string | null, email: string) {
  if (!isValidChineseName(name)) {
    throw generalBadRequestError("中文姓名无效。");
  }

  if (!z.string().email().safeParse(email).success) {
    throw generalBadRequestError("Email地址无效。");
  }
}

function checkPermissionToManageRoles(myRoles: Role[], subjectRoles: Role[]) {
  if (subjectRoles.length && !isPermitted(myRoles, "UserManager")) {
    throw noPermissionError("用户");
  }
}

export async function checkPermissionToAccessMentee(me: User, menteeId: string) {
  if (!await isPermittedtoAccessMentee(me, menteeId)) {
    throw noPermissionError("学生", menteeId);
  }
}

export async function isPermittedtoAccessMentee(me: User, menteeId: string) {
  if (isPermitted(me.roles, ["MentorCoach", "MentorshipManager"])) return true;
  if (await db.Mentorship.count(
    { where: { mentorId: me.id, menteeId } }) > 0) return true;
  return false;
}
