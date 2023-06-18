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

  enter: procedure.input(z.object({})).mutation(async ({ input, ctx }) => {
    // this is a public API available to all
    // when the user logged in for the first time
    //  1. there is an authing user
    //  2. there is no yuanjian user so we don't apply authentication here
    if (!ctx.authingUser) {
      // we don't throw error here because it's also valid when the user is logged out.
      return 'No token found in header' as const;
    }

    // auto create admin user
    if (ctx.authingUser.email) {
      const count = await User.count({
        where: {
          clientId: ctx.authingUser.id
        }
      });

      if (count == 0) {
        const isAdmin = apiEnv.ASSIGN_ADMIN_ROLE_ON_SIGN_UP.includes(ctx.authingUser.email);
        const roles : [Role] = [isAdmin ? 'ADMIN' : 'VISITOR'];

        console.log('creating user for', ctx.authingUser.id, ctx.authingUser.email, roles);
        invariant(ctx.authingUser.email);

        await User.create({
          name: "", // need to be manually entered
          pinyin: "",
          email: ctx.authingUser.email,
          clientId: ctx.authingUser.id,
          roles
        });
      }
    }

    return 'ok' as const;
  }),

  updateProfile: procedure.use(
    auth('profile:write')
  ).input(z.object({
    name: z.string().min(1, "required"),
  }))
    .mutation(async ({ input, ctx }) => {
      const updatedUser = findUser(ctx)
        .then(u => u.update({
          name: input.name,
          pinyin: pinyin.convertToPinyin(input.name),
        }));

      return 'ok' as const;
    })

});

export default user;
