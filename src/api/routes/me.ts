import { procedure, router } from "../tServer";
import { z } from "zod";
import auth, { invalidateLocalUserCache } from "../auth";
import { IUser } from "../../shared/user";
import pinyin from 'tiny-pinyin';

const me = router({
  profile: procedure.use(
    auth('profile:read')
  ).input(
    z.object({}),
  ).query(async ({ input, ctx }) => {
    return ctx.user as IUser;
  }),

  /**
   * In Edge or Serverless environments, user profile updates may take up to auth.USER_CACHE_TTL_IN_MS to propagate.
   * TODO: add a warning message in profile change UI.
   */
  updateProfile: procedure.use(
    auth('profile:write')
  ).input(
    // A Chinese name must have at least 2 characters.
    z.object({ name: z.string().min(2, "required") })
  ).mutation(async ({ input, ctx }) => {
  await ctx.user.update({
      name: input.name,
      pinyin: pinyin.convertToPinyin(input.name),
    });
    invalidateLocalUserCache();
  })
});

export default me;
