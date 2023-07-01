import { procedure, router } from "../trpc";
import { authUser, invalidateLocalUserCache } from "../auth";
import pinyin from 'tiny-pinyin';
import { zUserProfile } from "shared/UserProfile";
import { TRPCError } from "@trpc/server";

const me = router({

  profile: procedure
  .use(authUser())
  .output(zUserProfile)
  .query(async ({ ctx }) => ctx.user),

  /**
   * In Edge or Serverless environments, user profile updates may take up to auth.USER_CACHE_TTL_IN_MS to propagate.
   * TODO: add a warning message in profile change UI.
   */
  updateProfile: procedure
  .use(authUser())
  .input(zUserProfile)
  .mutation(async ({ input, ctx }) => {
    // Chinese names have at least two characters.
    if (!input.name || input.name.length < 2) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid user name'
      })
    }

    await ctx.user.update({
      name: input.name,
      pinyin: pinyin.convertToPinyin(input.name),
      consentFormAcceptedAt: input.consentFormAcceptedAt,
      // We don't allow users to update their own roles
    });
    invalidateLocalUserCache();
  })
});

export default me;
