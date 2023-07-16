import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, { AllRoles, RoleProfiles, isPermitted, zRoles } from "../../shared/Role";
import User from "../database/models/User";
import { Op } from "sequelize";
import { authUser, invalidateLocalUserCache } from "../auth";
import { zUserProfile } from "shared/UserProfile";
import { isValidChineseName, toPinyin } from "../../shared/strings";
import invariant from 'tiny-invariant';
import { email } from "api/sendgrid";
import { formatUserName } from 'shared/strings';
import { generalBadRequestError, noPermissionError, notFoundError } from "api/errors";

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
  await User.create({
    name: input.name,
    pinyin: toPinyin(input.name),
    email: input.email,
    roles: input.roles,
  });
});

/**
 * @return all the users if `searchTerm` isn't specified, otherwise only matching users, ordered by Pinyin.
 */
const list = procedure
  .use(authUser(['UserManager', 'GroupManager']))
  .input(z.object({ searchTerm: z.string() }).optional())
  .output(z.array(zUserProfile))
  .query(async ({ input }) => 
{
  return await User.findAll({ 
    order: [['pinyin', 'ASC']],
    ...input?.searchTerm ? {
      where: {
        [Op.or]: [
          { pinyin: { [Op.iLike]: `%${input.searchTerm}%` } },
          { name: { [Op.iLike]: `%${input.searchTerm}%` } },
          { email: { [Op.iLike]: `%${input.searchTerm}%` } },
        ],
      }
    } : {},
  });
});

/**
 * In Edge or Serverless environments, user profile updates may take up to auth.USER_CACHE_TTL_IN_MS to propagate.
 * TODO: add a warning message in profile change UI.
 */
const update = procedure
  .use(authUser())
  .input(zUserProfile)
  .mutation(async ({ input, ctx }) => 
{
  checkUserFields(input.name, input.email);

  const isUserOrPRManager = isPermitted(ctx.user.roles, ['UserManager', 'PrivilegedRoleManager']);
  const isSelf = ctx.user.id === input.id;
  // Anyone can update user profiles, but non-user- and non-privileged-role-managers can only update their own.
  if (!isUserOrPRManager && !isSelf) {
    throw noPermissionError("用户", input.id);
  }

  const user = await User.findByPk(input.id);
  if (!user) {
    throw notFoundError("用户", input.id);
  }

  const rolesToAdd = input.roles.filter(r => !user.roles.includes(r));
  const rolesToRemove = user.roles.filter(r => !input.roles.includes(r));
  checkPermissionForManagingPrivilegedRoles(ctx.user.roles, [...rolesToAdd, ...rolesToRemove]);

  if (!isSelf) {
    await emailUserAboutNewPrivilegedRoles(ctx.user.name, user, input.roles, ctx.baseUrl);
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
  return await User.findAll({ 
    // TODO: Optimize with postgres `?|` operator
    where: {
      [Op.or]: AllRoles.filter(r => RoleProfiles[r].privilegedUserDataAccess).map(r => ({
        roles: { [Op.contains]: r }
      })),
    },
    attributes: ['name', 'roles'],
  });
});

const users = router({
  create,
  list,
  update,
  listPriviledgedUserDataAccess,
});
export default users;

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
        name: user.name, 
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

