import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, { AllRoles, RoleProfiles, isPermitted, zRoles } from "../../shared/Role";
import db from "../database/db";
import { Op } from "sequelize";
import { authUser } from "../auth";
import User, { zMinUser, zUser, zUserFilter } from "../../shared/User";
import { isValidChineseName, toPinyin } from "../../shared/strings";
import invariant from 'tiny-invariant';
import { email } from "../sendgrid";
import { formatUserName } from '../../shared/strings';
import { generalBadRequestError, noPermissionError, notFoundError, notImplemnetedError } from "../errors";
import Interview from "../database/models/Interview";
import { InterviewType, zInterviewType } from "../../shared/InterviewType";
import { 
  minUserAttributes, 
  userAttributes, 
} from "../database/models/attributesAndIncludes";
import { getCalibrationAndCheckPermissionSafe } from "./calibrations";
import sequelize from "../database/sequelize";
import { createGroup, updateGroup } from "./groups";
import { zMenteeStatus } from "../../shared/MenteeStatus";

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
  checkPermissionForManagingRoles(ctx.user.roles, input.roles);
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
  .use(authUser(['UserManager', 'GroupManager', 'MenteeManager']))
  .input(zUserFilter)
  .output(z.array(zUser))
  .query(async ({ input: filter }) =>
{
  if (filter.hasMentorApplication) throw notImplemnetedError();

  // Force typescript checking
  const interviewType: InterviewType = "MenteeInterview";

  const res = await db.User.findAll({ 
    order: [['pinyin', 'ASC']],

    where: {
      ...filter.containsRoles === undefined ? {} : {
        [Op.and]: filter.containsRoles.map(r => ({
          roles: { [Op.contains]: r }
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

    include: [      
      ...filter.isMenteeInterviewee === undefined ? [] : [{
        model: Interview,
        attributes: ["id"],
        ...filter.isMenteeInterviewee ? { where: { type: interviewType } } : {},
      }],
    ],
  });

  return filter.isMenteeInterviewee == false ?
    res.filter(u => u.interviews.length == 0) : res;
});

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
  checkPermissionForManagingRoles(ctx.user.roles,
    [...rolesToAdd, ...rolesToRemove]);

  if (!isSelf) {
    await emailUserAboutNewManualRoles(ctx.user.name ?? "", user, input.roles,
      ctx.baseUrl);
  }

  invariant(input.name);
  await user.update({
    name: input.name,
    pinyin: toPinyin(input.name),
    consentFormAcceptedAt: input.consentFormAcceptedAt,

    // fields that only user or role managers can change
    ...isUserManager ? {
      roles: input.roles,
      email: input.email,
    } : {},
  });
});

const updateMenteeStatus = procedure
  .use(authUser("MenteeManager"))
  .input(z.object({
    userId: z.string(),
    menteeStatus: zMenteeStatus.nullable()
  }))
  .mutation(async ({ input: { userId, menteeStatus } }) => 
{
  const user = await db.User.findByPk(userId);
  if (!user) throw notFoundError("用户", userId);
  await user.update({ menteeStatus });
});

const get = procedure
  .use(authUser())
  .input(z.string())
  .output(zMinUser)
  .query(async ({ ctx, input: userId }) =>
{
  if (!isPermitted(ctx.user.roles, "UserManager") &&
    !await isPermittedForMentee(ctx.user, userId)) {
    throw noPermissionError("用户", userId);
  }

  const u = await db.User.findByPk(userId, {
    attributes: minUserAttributes,
  });

  if (!u) throw notFoundError("用户", userId);
  return u;
});


/**
 * Only the user themselves, MentorCoach, and MenteeManager have access.
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
    ["MentorCoach", "MenteeManager"])) {
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
  .use(authUser("MenteeManager"))
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

/**
 * Only MenteeManagers, MentorCoaches, mentor of the applicant, interviewers
 * of the applicant, and participants of the calibration (only if the calibration
 * is active) are allowed to call this route.
 * 
 * If the user is not an MenteeManager, contact information is redacted.
 */
const getApplicant = procedure
  .use(authUser())
  .input(z.object({
    userId: z.string(),
    type: zInterviewType,
  }))
  .output(z.object({
    user: zUser,
    application: z.record(z.string(), z.any()).nullable(),
  }))
  .query(async ({ ctx, input: { userId, type } }) =>
{
  if (type !== "MenteeInterview") throw notImplemnetedError();

  const user = await db.User.findByPk(userId, {
    attributes: [...userAttributes, "menteeApplication"],
  });
  if (!user) throw notFoundError("用户", userId);

  const ret: { user: User, application: Record<string, any> | null } = { 
    user, application: user.menteeApplication
  };

  if (isPermitted(ctx.user.roles, "MenteeManager")) return ret;

  // Redact
  user.email = "redacted@redacted.com";
  user.wechat = "redacted";

  if (await isPermittedForMentee(ctx.user, userId)) return ret;

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

  throw noPermissionError("申请资料", user.id);
});

/**
 * TODO: Support etag. Refer to `interviewFeedbacks.update`.
 */
const updateApplication = procedure
  .use(authUser("MenteeManager"))
  .input(z.object({
    userId: z.string(),
    type: zInterviewType,
    application: z.record(z.string(), z.any()),
  }))
  .mutation(async ({ input }) =>
{
  const [cnt] = await db.User.update({
    [input.type == "MenteeInterview" ? "menteeApplication" : "mentorApplication"]: input.application,
  }, { where: { id: input.userId } });
  invariant(cnt <= 1);
  if (!cnt) throw notFoundError("用户", input.userId);
});

/**
 * List all users and their roles who have privileged user data access. See RoleProfile.privilegeUserDataAccess for an
 * explanation.
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
      [Op.or]: AllRoles.filter(r => RoleProfiles[r].privilegedUserDataAccess).map(r => ({
        roles: { [Op.contains]: r }
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
  create,
  get,
  list,
  listPriviledgedUserDataAccess,
  getApplicant,

  update,
  updateMenteeStatus,
  updateApplication,
  destroy,

  getMentorCoach,
  setMentorCoach,
});

function checkUserFields(name: string | null, email: string) {
  if (!isValidChineseName(name)) {
    throw generalBadRequestError("中文姓名无效。");
  }

  if (!z.string().email().safeParse(email).success) {
    throw generalBadRequestError("Email地址无效。");
  }
}

function checkPermissionForManagingRoles(userRoles: Role[], subjectRoles: Role[]) {
  if (subjectRoles.length && !isPermitted(userRoles, "UserManager")) {
    throw noPermissionError("用户");
  }
}

export async function checkPermissionForMentee(me: User, menteeId: string) {
  if (!await isPermittedForMentee(me, menteeId)) {
    throw noPermissionError("学生", menteeId);
  }
}

export async function isPermittedForMentee(me: User, menteeId: string) {
  if (isPermitted(me.roles, ["MentorCoach", "MenteeManager"])) return true;
  if (await db.Mentorship.count(
    { where: { mentorId: me.id, menteeId } }) > 0) return true;
  return false;
}

async function emailUserAboutNewManualRoles(userManagerName: string, user: User,
  roles: Role[], baseUrl: string) 
{
  const added = roles.filter(r => !user.roles.includes(r)).filter(
    r => !RoleProfiles[r].automatic);
  for (const r of added) {
    const rp = RoleProfiles[r];
    await email('d-7b16e981f1df4e53802a88e59b4d8049', [{
      to: [{ 
        name: formatUserName(user.name, 'formal'), 
        email: user.email 
      }],
      dynamicTemplateData: {
        'roleDisplayName': rp.displayName,
        'roleActions': rp.actions,
        'name': formatUserName(user.name, 'friendly'),
        'manager': userManagerName,
      }
    }], baseUrl);
  }
}
