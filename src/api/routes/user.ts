import { procedure, router } from "../tServer";
import { z } from "zod";
import auth from "../auth";
import apiEnv from "../apiEnv";
import User from "../database/models/User";
import { IUser } from "../../shared/user";
import { Role } from "../../shared/RBAC";
import invariant from "tiny-invariant";
import pinyin from 'tiny-pinyin';
import { Context } from "api/context";
import { UniqueConstraintError } from "sequelize";

async function findUser(ctx: Context) {
  const user = await User.findOne({ where: { clientId: ctx.authingUser?.id } });
  invariant(user);
  return user;
}

const user = router({
  profile: procedure.use(
    auth('profile:read')
  ).input(
    z.object({}),
  ).query(async ({ input, ctx }) => {
    return findUser(ctx).then(u => u as IUser);
  }),

  enter: procedure.input(
    z.object({})
  ).mutation(async ({ input, ctx }) => {
    // this is a public API available to all
    // when the user logged in for the first time
    //  1. there is an authing user
    //  2. there is no yuanjian user so we don't apply authentication here
    if (!ctx.authingUser) {
      // we don't throw error here because it's also valid when the user is logged out.
      return 'No token found in header' as const;
    }

    if (ctx.authingUser.email) {
      await createUserIfNotExist(ctx.authingUser.id, ctx.authingUser.email);
    }
    return 'ok' as const;
  }),

  updateProfile: procedure.use(
    auth('profile:write')
  ).input(
    z.object({ name: z.string().min(1, "required")})
  ).mutation(async ({ input, ctx }) => {
    const updatedUser = findUser(ctx)
      .then(u => u.update({
        name: input.name,
        pinyin: pinyin.convertToPinyin(input.name),
      }));

    return 'ok' as const;
  })
});

export default user;

async function createUserIfNotExist(id: string, email: string) {
  invariant(email);

  /**
   * Frontend calls user.enter multiple times when a new user logs in, causing parallel User.create() from time to
   * time which results in unique constraint errors.
   * 
   * As a speed optimization, we simply retry on such errors instead of using pessimistic locking.
   * 
   * TODO: Fix the frontend to suppress unnecessary calls to user.enter.  
   */
  while (true) {
    const count = await User.count({
      where: {
        clientId: id
      },
    });

    if (count == 0) {
      const isAdmin = apiEnv.ASSIGN_ADMIN_ROLE_ON_SIGN_UP.includes(email);
      const roles: [Role] = [isAdmin ? 'ADMIN' : 'VISITOR'];
      try {
        console.log(`Creating user ${email} roles ${roles} id ${id}`);
        await User.create({
          name: "",
          pinyin: "",
          email: email,
          clientId: id,
          roles
        });
      } catch (e) {
        if (e instanceof UniqueConstraintError) {
          console.log(`Unique constraint error when creating user ${email}. Assuming user already exists. Retry.`);
          continue;
        } else {
          throw e;
        }
      }
    }

    break;
  }
}