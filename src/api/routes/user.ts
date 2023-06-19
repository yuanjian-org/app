import { procedure, router } from "../tServer";
import { z } from "zod";
import auth from "../auth";
import { IUser } from "../../shared/user";
import pinyin from 'tiny-pinyin';

const user = router({
  profile: procedure.use(
    auth('profile:read')
  ).input(
    z.object({}),
  ).query(async ({ input, ctx }) => {
    return ctx.user as IUser;
  }),

  updateProfile: procedure.use(
    auth('profile:write')
  ).input(
    // A Chinese name must have at least 2 characters.
    z.object({ name: z.string().min(2, "required")})
  ).mutation(async ({ input, ctx }) => {
    await ctx.user.update({
      name: input.name,
      pinyin: pinyin.convertToPinyin(input.name),
    });
  })
});

export default user;
