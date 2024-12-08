import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, {
  AllRoles, 
  RoleProfiles, 
  isPermitted, 
  zRoles 
} from "../../shared/Role";
import db from "../database/db";
import { Op, Transaction } from "sequelize";
import { authUser } from "../auth";
import User, {
  defaultMentorCapacity, 
  isAcceptedMentee, 
  zMinUser, 
  zUser, 
  zUserFilter, 
  zUserPreference,
  zUserWithMergeInfo
} from "../../shared/User";
import { 
  formatUserName,
  isValidChineseName,
  toPinyin
} from "../../shared/strings";
import invariant from 'tiny-invariant';
import {
  generalBadRequestError,
  noPermissionError,
  notFoundError
} from "../errors";
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
import { fakeEmailDomain } from "../../shared/fakeEmail";
import { zUserState } from "../../shared/UserState";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";

const create = procedure
  .use(authUser('UserManager'))
  .input(z.object({
    name: z.string(),
    email: z.string(),
    roles: zRoles,
  }))
  .mutation(async ({ ctx, input }) => 
{
  await sequelize.transaction(async transaction => {
    checkPermissionToManageRoles(ctx.user.roles, input.roles);
    await createUser({
      name: input.name,
      email: input.email,
      roles: input.roles,
    }, transaction);
  });
});

export async function createUser(
  input: Record<string, any>,
  transaction: Transaction,
  mode: "create" | "upsert" = "create"
): Promise<User> {
  // We don't check Chinese name validity when creating a user, because the user
  // may be automatically created via WeChat sign-in or application form
  // submission. We simply can't enforce Chinese names in these cases without
  // breaking the flow.

  validateUserInput(input.email, input.url);
  const f = {
    ...input,
    pinyin: toPinyin(input.name ?? ""),
    ...await checkAndPopulateUrl(input.name, input.roles, null, input.url,
      transaction),
  };

  return mode == "create" ?
    await db.User.create(f, { transaction }) :
    (await db.User.upsert(f, { transaction }))[0];
}

/**
 * Returned users are ordered by Pinyin.
 */
const list = procedure
  .use(authUser(['UserManager', 'GroupManager', 'MentorshipManager']))
  .input(zUserFilter)
  .output(z.array(zUserWithMergeInfo))
  .query(async ({ ctx: { user }, input: filter }) =>
{ 
  if (filter.includeBanned === true
    || filter.includeMerged === true
    || filter.returnMergeInfo === true
  ) {
    if (!isPermitted(user.roles, "UserManager")) {
      throw noPermissionError("数据",
        "includeBanned, includeMerged or returnMergeInfo user filter");
    }
  }

  // Force type checking.
  const banned: Role = "Banned";
  const volunteer: Role = "Volunteer";

  return (await db.User.findAll({
    order: [['pinyin', 'ASC']],

    attributes: userAttributes,

    include: [
      ...userInclude,
      ...filter.returnMergeInfo === true ? [{
        association: "mergedFrom",
        attributes: minUserAttributes,
      }, {
        association: "mergedToUser",
        attributes: minUserAttributes,
      }, {
        association: "mergeToken",
        attributes: ["expiresAt"],
      }] : [],
    ],

    where: {
      ...filter.includeMerged === true ? {} : {
        mergedTo: { [Op.eq]: null }
      },

      ...filter.includeBanned === true ? {} : {
        [Op.not]: { roles: { [Op.contains]: [banned] } }
      },

      ...filter.includeNonVolunteers === true ? {} : {
        roles: { [Op.contains]: [volunteer] }
      },

      ...filter.containsRoles === undefined ? {} : {
        [Op.and]: filter.containsRoles.map(r => ({
          roles: { [Op.contains]: [r] }
        }))
      },

      ...filter.menteeStatus === undefined ? {} : {
        menteeStatus: filter.menteeStatus
      },

      ...filter.pointOfContactId === undefined ? {} : {
        pointOfContactId: filter.pointOfContactId
      },

      ...filter.matchesNameOrEmail === undefined ? {} : {
        [Op.or]: [
          { pinyin: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
          { name: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
          { [Op.and]: [
            { email: { [Op.notLike]: `%${fakeEmailDomain}` } },
            { email: { [Op.iLike]: `%${filter.matchesNameOrEmail}%` } },
          ] },
        ],
      },
    },
  }));
});

const listMentorProfiles = procedure
  .use(authUser())
  .output(z.array(zMinUserAndProfile.merge(z.object({
    relational: z.boolean(),
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
    const adhoc = u.roles.includes("TransactionalMentor");
    const cap = adhoc ? 0 :
      (u.preference?.mentor?.最多匹配学生 ?? defaultMentorCapacity)
      - (user2mentorships[u.id] ?? 0);

    return {
      user: u,
      profile: u.profile ?? {},
      relational: cap > 0,
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
  await sequelize.transaction(async transaction => {
    // Validate user input
    validateUserInput(input.email, input.url);
    if (!isValidChineseName(input.name)) {
      throw generalBadRequestError("中文姓名无效。");
    }
    invariant(input.name);

    const isUserManager = isPermitted(ctx.user.roles, 'UserManager');
    const isSelf = ctx.user.id === input.id;

    // Non-UserManagers can only update their own profile.
    if (!isUserManager && !isSelf) {
      throw noPermissionError("用户", input.id);
    }

    const user = await db.User.findByPk(input.id, {
      attributes: ['id', 'roles', 'url'],
      transaction,
    });
    if (!user) {
      throw notFoundError("用户", input.id);
    }

    const rolesToAdd = input.roles.filter(r => !user.roles.includes(r));
    const rolesToRemove = user.roles.filter(r => !input.roles.includes(r));
    checkPermissionToManageRoles(ctx.user.roles,
      [...rolesToAdd, ...rolesToRemove]);

    await user.update({
      name: input.name,
      wechat: input.wechat,
      pinyin: toPinyin(input.name),
      consentFormAcceptedAt: input.consentFormAcceptedAt,
      ...await checkAndPopulateUrl(input.name, input.roles, user.url, input.url,
        transaction),

      // fields that only UserManagers can change
      ...isUserManager ? {
        roles: input.roles,
        email: input.email,
      } : {},
    }, { transaction });

    invalidateUserCache(user.id);
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

/**
 * Query users using either userId or userUrl but not both
 */
const getUserProfile = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string().optional(),
    userUrl: z.string().optional(),
  }))
  .output(zMinUserAndProfile.merge(z.object({
    isMentor: z.boolean(),
  })))
  .query(async ({ ctx: { user: me }, input: { userId, userUrl } }) => 
{
  if (!!userId === !!userUrl) {
    throw generalBadRequestError(
      "Must provide either userId or userUrl and not both.");
  }

  const attributes = [...minUserAttributes, 'menteeStatus', 'roles', 'profile'];
  const u = userId ?
    await db.User.findByPk(userId, { attributes })
    :
    await db.User.findOne({ where: { url: userUrl }, attributes });

  if (!u) throw notFoundError("用户", userId || userUrl || "");

  /**
   * N.B. Update /who-can-see-my-data when changing permission here.
   */

  if (me.id !== u.id &&

    // These roles can access profiles of all the users
    !isPermitted(me.roles, ["Mentor", "MentorshipManager", "UserManager"]) &&

    // Volunteers who are not in the roles above can only access other
    // volunteers profiles
    !(isPermitted(me.roles, "Volunteer") && isPermitted(u.roles, "Volunteer")) &&

    // Accepted mentoees can only access mentor profiles
    !(isAcceptedMentee(me.roles, me.menteeStatus, true) &&
      isPermitted(u.roles, "Mentor"))
  ) {
    throw noPermissionError("用户", u.id);
  }

  return {
    user: u,
    profile: u.profile ?? {},
    isMentor: isPermitted(u.roles, "Mentor"),
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

const getUserState = procedure
  .use(authUser())
  .output(zUserState.nullable())
  .query(async ({ ctx: { user } }) =>
{
  const u = await db.User.findByPk(user.id, {
    attributes: ["state"],
  });

  if (!u) throw notFoundError("用户", user.id);
  return u.state;
});

const setUserState = procedure
  .use(authUser())
  .input(zUserState)
  .mutation(async ({ ctx: { user }, input: state }) => 
{
  const [cnt] = await db.User.update({ state }, { where: { id: user.id } });
  if (cnt == 0) throw notFoundError("用户", user.id);
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
    coachId: z.string().nullable(),
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
    if (coachId) {
      const coach = await db.User.findByPk(coachId, { lock: true, transaction });
      if (!coach) throw notFoundError("用户", coachId);
      coach.roles = [...coach.roles.filter(r => r != "MentorCoach"),
        "MentorCoach"];
      await coach.save({ transaction });
    }

    // create or update group
    if (oldCoachId) {
      const gs = await db.Group.findAll({
        where: { coacheeId: userId },
        attributes: ["id", "public"],
      });
      invariant(gs.length == 1);

      await updateGroup(gs[0].id, null, gs[0].public,
        [userId, ...coachId ? [coachId] : []],
        transaction);

    } else if (coachId) {
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
    await user.destroy({ transaction });
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

  getUserState,
  setUserState,

  getMentorCoach,
  setMentorCoach,

  setUserPreference,
  getUserPreference,

  setPointOfContactAndNote,
  
});

function validateUserInput(
  email: string,
  url: string | null | undefined,
) {
  if (!z.string().email().safeParse(email).success) {
    throw generalBadRequestError("Email地址无效。");
  }

  if (url !== null && url !== undefined && !isValidUserUrl(url)) {
    throw generalBadRequestError("用户URL格式无效。只允许小写英文字母和数字。");
  }
}

function isValidUserUrl(url: string) {
  return /^[a-z0-9]+$/.test(url);
}

/**
 * This function assumes all input has been validated (via validateUserInput())
 */
async function checkAndPopulateUrl(
  newName: string | null | undefined,
  newRoles: Role[] | undefined,
  oldUrl: string | null,
  newUrl: string | null | undefined,
  transaction: Transaction
): Promise<{
  url?: string | null
}> {
  const isVolunteer = newRoles && isPermitted(newRoles, "Volunteer");

  if (newUrl !== undefined && newUrl !== null) {
    if (newUrl === oldUrl) {
      // Nothing is changing
      return {};

    } else if (!isVolunteer) {
      // Only volunteers are allowed to set urls
      throw generalBadRequestError(`非${RoleProfiles.Volunteer.displayName}` +
        "没有设置URL的权限。");

    } else {
      if (await db.User.count({ where: { url: newUrl }, transaction })) {
        throw generalBadRequestError("此用户URL已被注册。");
      }
      return { url: newUrl };
    }

  } else if (oldUrl !== null) {
    // Retain the old url if it's already set
    return {};

  } else if (!isVolunteer) {
    // Only populate urls for volutneers
    return {};

  } else {
    // Auto generate an url
    const base = newName ? toPinyin(formatUserName(newName, "friendly")) :
      "anonymous";
    
    let suffix = 1;
    const getNextUrl = () => {
      const ret = base + (suffix == 1 ? "" : `${suffix}`);
      suffix++;
      return ret;
    };

    while (true) {
      const url = getNextUrl();
      if (await db.User.count({ where: { url }, transaction }) === 0) {
        return { url };
      }
    }
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
