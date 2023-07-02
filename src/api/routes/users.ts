import { procedure, router } from "../trpc";
import { z } from "zod";
import Role, { isPermitted, zRoles } from "../../shared/Role";
import User from "../database/models/User";
import { TRPCError } from "@trpc/server";
import { Op } from "sequelize";
import { authUser, invalidateLocalUserCache } from "../auth";
import pinyin from 'tiny-pinyin';
import { zUserProfile } from "shared/UserProfile";
import { isValidChineseName } from "../../shared/utils/string";
import invariant from 'tiny-invariant';
import { email } from "api/sendgrid";

const users = router({
  create: procedure
  .use(authUser('UserManager'))
  .input(z.object({
    name: z.string().min(1, "required"),
    pinyin: z.string(),
    email: z.string().email(),
    clientId: z.string().min(1, "required"),
    roles: zRoles.min(1, "required"),
  }))
  .mutation(async ({ input, ctx }) => {
    const user = await User.findOne({
      where: {
        clientId: input.clientId
      }
    });

    if (user) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'this user is already created in our db',
      });
    }

    await User.create({
      name: input.name,
      pinyin: input.pinyin,
      email: input.email,
      roles: input.roles,
      clientId: input.clientId
    });

    return 'ok' as const;
  }),

  /**
   * @return all the users if `fullTextSearch` isn't specified, otherwise only matching users, ordered by Pinyin.
   */
  list: procedure
  .use(authUser(['UserManager', 'GroupManager']))
  .input(z.object({ searchTerm: z.string() }).optional())
  .output(z.array(zUserProfile))
  .query(async ({ input }) => {
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
  }),

  /**
   * In Edge or Serverless environments, user profile updates may take up to auth.USER_CACHE_TTL_IN_MS to propagate.
   * TODO: add a warning message in profile change UI.
   */
  update: procedure
  .use(authUser())
  .input(zUserProfile)
  .mutation(async ({ input, ctx }) => {
    const isUserManager = isPermitted(ctx.user.roles, 'UserManager');
    const isSelf = ctx.user.id === input.id;
    // Anyone can update user profiles, but non-UserManagers can only update their own.
    if (!isUserManager && !isSelf) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: '用户权限不足。'
      })
    }
    if (!isValidChineseName(input.name)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: '中文姓名无效。'
      })
    }
    invariant(input.name);

    const user = await User.findByPk(input.id);
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `用户ID不存在：${input.id}`,
      });
    }

    if (!isSelf) await emailUserAboutNewRoles(ctx.user.name, user, input.roles, ctx.baseUrl);

    await user.update({
      name: input.name,
      pinyin: pinyin.convertToPinyin(input.name),
      consentFormAcceptedAt: input.consentFormAcceptedAt,
      ...isUserManager ? {
        roles: input.roles,
        email: input.email,
      } : {},
    });
    invalidateLocalUserCache();
  })
});

export default users;

async function emailUserAboutNewRoles(userManagerName: string, user: User, newRoles: Role[], baseUrl: string) {
  const added = newRoles.filter(r => !user.roles.includes(r));
  for (const r of added) {
    await email('d-7b16e981f1df4e53802a88e59b4d8049', [{
      to: [{ 
        name: user.name, 
        email: user.email 
      }],
      dynamicTemplateData: {
        'role': r,
        'manager': userManagerName,
      }
    }], baseUrl);
  }
}

