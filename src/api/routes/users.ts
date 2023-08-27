import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, { AllRoles, RoleProfiles, isPermitted, zRoles } from "../../shared/Role";
import db from "../database/db";
import { Op } from "sequelize";
import { authUser, invalidateLocalUserCache } from "../auth";
import User, { zUser, zUserFilter } from "../../shared/User";
import { isValidChineseName, toPinyin } from "../../shared/strings";
import invariant from 'tiny-invariant';
import { email } from "../sendgrid";
import { formatUserName } from '../../shared/strings';
import { generalBadRequestError, noPermissionError, notFoundError, notImplemnetedError } from "../errors";
import Interview from "api/database/models/Interview";
import { InterviewType, zInterviewType } from "shared/InterviewType";
import { userAttributes } from "../database/models/attributesAndIncludes";
import { getCalibrationAndCheckPermissionSafe } from "./calibrations";

const me = procedure
  .use(authUser())
  .output(zUser)
  .query(async ({ ctx }) => ctx.user);

const meNoCache = procedure
  .use(authUser())
  .output(zUser)
  .query(async ({ ctx }) => 
{
  // invalidate catch so next time `me` will also return fresh data
  invalidateLocalUserCache();

  const user = await db.User.findByPk(ctx.user.id, {
    attributes: userAttributes,
  });
  invariant(user);
  return user;
});

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
  checkPermissionForManagingPrivilegedRoles(ctx.user.roles, input.roles);
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
  .use(authUser(['UserManager', 'GroupManager', 'InterviewManager']))
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
      ...filter.hasMenteeApplication == undefined ? {} : {
        menteeApplication: { 
          ...filter.hasMenteeApplication ? { [Op.ne]: null } : { [Op.eq]: null }
        },
      },

      ...filter.matchNameOrEmail == undefined ? {} : {
        [Op.or]: [
          { pinyin: { [Op.iLike]: `%${filter.matchNameOrEmail}%` } },
          { name: { [Op.iLike]: `%${filter.matchNameOrEmail}%` } },
          { email: { [Op.iLike]: `%${filter.matchNameOrEmail}%` } },
        ],
      },
    },

    include: [      
      ...filter.isMenteeInterviewee == undefined ? [] : [{
        model: Interview,
        attributes: ["id"],
        ...filter.isMenteeInterviewee ? { where: { type: interviewType } } : {},
      }],
    ],
  });

  if (filter.isMenteeInterviewee == false) return res.filter(u => u.interviews.length == 0);
  else return res;
});

/**
 * In Edge or Serverless environments, user profile updates may take up to auth.USER_CACHE_TTL_IN_MS to propagate.
 * TODO: add a warning message in profile change UI.
 */
const update = procedure
  .use(authUser())
  .input(zUser)
  .mutation(async ({ input, ctx }) => 
{
  checkUserFields(input.name, input.email);

  const isUserOrPRManager = isPermitted(ctx.user.roles, ['UserManager', 'PrivilegedRoleManager']);
  const isSelf = ctx.user.id === input.id;
  // Anyone can update user profiles, but non-user- and non-privileged-role-managers can only update their own.
  if (!isUserOrPRManager && !isSelf) {
    throw noPermissionError("用户", input.id);
  }

  const user = await db.User.findByPk(input.id);
  if (!user) {
    throw notFoundError("用户", input.id);
  }

  const rolesToAdd = input.roles.filter(r => !user.roles.includes(r));
  const rolesToRemove = user.roles.filter(r => !input.roles.includes(r));
  checkPermissionForManagingPrivilegedRoles(ctx.user.roles, [...rolesToAdd, ...rolesToRemove]);

  if (!isSelf) {
    await emailUserAboutNewPrivilegedRoles(ctx.user.name ?? "", user, input.roles, ctx.baseUrl);
  }

  invariant(input.name);
  await user.update({
    name: input.name,
    pinyin: toPinyin(input.name),
    consentFormAcceptedAt: input.consentFormAcceptedAt,
    ...isUserOrPRManager ? {
      roles: input.roles,
      email: input.email,
    } : {},
  });
  invalidateLocalUserCache();
});

/**
 * Only InterviewManagers, interviewers of the application, and participants of the calibration (only if the calibration
 * is active) are allowed to call this route. If the user is not an InterviewManager, contact information is redacted.
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
  .query(async ({ ctx, input }) =>
{
  if (input.type !== "MenteeInterview") throw notImplemnetedError();

  const user = await db.User.findByPk(input.userId, {
    attributes: [...userAttributes, "menteeApplication"],
  });
  if (!user) throw notFoundError("用户", input.userId);

  const ret: { user: User, application: Record<string, any> | null } = { user, application: user.menteeApplication };

  if (isPermitted(ctx.user.roles, "InterviewManager")) return ret;

  // Redact
  user.email = "redacted@redacted.com";
  user.wechat = "redacted";

  // Check if the user is an interviewer
  const myInterviews = await db.Interview.findAll({
    where: {
      type: input.type,
      intervieweeId: input.userId,
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
      type: input.type,
      intervieweeId: input.userId,
    },
    attributes: ["calibrationId"],
  });
  for (const i of allInterviews) {
    if (i.calibrationId && await getCalibrationAndCheckPermissionSafe(ctx.user, i.calibrationId)) return ret;
  }

  throw noPermissionError("申请资料", user.id);
});

/**
 * List all users and their roles who have privileged user data access. See RoleProfile.privilegeUserDataAccess for an
 * explanation.
 */
const listPriviledgedUserDataAccess = procedure
  .use(authUser())
  .output(z.array(z.object({
    name: z.string(),
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

export default router({
  me,
  meNoCache,
  create,
  list,
  update,
  listPriviledgedUserDataAccess,
  getApplicant,
});

function checkUserFields(name: string | null, email: string) {
  if (!isValidChineseName(name)) {
    throw generalBadRequestError("中文姓名无效。");
  }

  if (!z.string().email().safeParse(email).success) {
    throw generalBadRequestError("Email地址无效。");
  }
}

function checkPermissionForManagingPrivilegedRoles(userRoles: Role[], subjectRoles: Role[]) {
  if (subjectRoles.some(r => RoleProfiles[r].privileged) && !isPermitted(userRoles, "PrivilegedRoleManager")) {
    throw noPermissionError("用户");
  }
}

async function emailUserAboutNewPrivilegedRoles(userManagerName: string, user: User, roles: Role[], baseUrl: string) {
  const added = roles.filter(r => !user.roles.includes(r)).filter(r => RoleProfiles[r].privileged);
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
