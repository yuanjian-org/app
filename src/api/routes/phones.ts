import { procedure, router } from "../trpc";
import { z } from "zod";
import db from "../database/db";
import { Op } from "sequelize";
import { authUser } from "../auth";
import { toChineseNumber } from "../../shared/strings";
import { generalBadRequestError } from "../errors";
import sequelize from "../database/sequelize";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import {
  phoneTokenMaxAgeInMins,
  phoneTokenMinSendIntervalInSeconds,
  generateShortLivedToken,
} from "../../shared/token";
import { sms } from "../sms";
import moment from "moment";

const sendVerificationToken = procedure
  .use(authUser())
  .input(z.object({ phone: z.string() }))
  .mutation(async ({ input: { phone }, ctx: { me } }) => {
    await sequelize.transaction(async (transaction) => {
      const existing = await db.PhoneVerificationToken.findByPk(me.id, {
        attributes: ["updatedAt"],
        transaction,
      });
      if (
        existing &&
        moment().diff(existing.updatedAt, "seconds") <
          phoneTokenMinSendIntervalInSeconds
      ) {
        throw generalBadRequestError("手机验证码发送过于频繁。");
      }

      const token = await generateShortLivedToken();
      await db.PhoneVerificationToken.upsert(
        { userId: me.id, phone, token },
        { transaction },
      );

      await sms("yaD264", "0Rr8G", [
        {
          to: phone,
          vars: {
            token: token.toString(),
            tokenMaxAgeInMins: toChineseNumber(phoneTokenMaxAgeInMins),
          },
        },
      ]);
    });
  });

/**
 * The frontend should call `update` in `useSession()` to update the session as
 * soon as this route returns, because this route may merge the current user
 * with another user.
 */
const set = procedure
  .use(authUser())
  .input(
    z.object({
      phone: z.string(),
      token: z.string(),
    }),
  )
  .mutation(async ({ input: { phone, token }, ctx: { me } }) => {
    await sequelize.transaction(async (transaction) => {
      const tocken = await db.PhoneVerificationToken.findOne({
        where: { userId: me.id, phone, token },
        attributes: ["userId", "updatedAt"],
        transaction,
      });

      if (!tocken) {
        throw generalBadRequestError("手机验证码错误。");
      } else if (
        moment().diff(tocken.updatedAt, "minutes") > phoneTokenMaxAgeInMins
      ) {
        throw generalBadRequestError("手机验证码已过期，请重新验证。");
      }
      await tocken.destroy({ transaction });

      const existing = await db.User.findOne({
        attributes: ["id"],
        where: { phone, id: { [Op.ne]: me.id } },
        transaction,
      });

      if (!existing) {
        await me.update({ phone }, { transaction });
        invalidateUserCache(me.id);
      } else {
        if (me.phone) {
          // If the current user already has a phone number, account merge would
          // cause data loss or inconsistency if we don't carefully merge all
          // the data associated with the two accounts. So we disallow it.
          throw generalBadRequestError("手机号已被其他账号使用。");
        } else {
          // Merge accounts.
          //
          // Overwrite email and wechat of `existing`. These fields are used by
          // next-auth for user authentication.
          //
          // Ignore other data associated with the current user. This is because
          // the user is expected to set the phone number during initial setup.
          // At this stage, no useful data has been provided.
          //
          // A: Why the `mergeTo` field? Why not delete the current user right
          //    away?
          // Q: The current user's id is encoded in the JWT token. The backend
          //    cannot initiate an immediate update to the JWT token. Deleting
          //    the current user would cause the system unable to find the user
          //    in the session and in turn the user to be immediately logged
          //    out. See the `session` callback in [...nextauth].ts. Instead of
          //    disrupting the user experience during the initial setup, we
          //    periodically garbage collect merged users, forcing them to
          //    re-login at a much later time.
          //
          const email = me.email;
          const wechatUnionId = me.wechatUnionId;
          await me.update(
            {
              email: null,
              wechatUnionId: null,
              mergedTo: existing.id,
            },
            { transaction },
          );
          await existing.update(
            {
              ...(email && { email }),
              ...(wechatUnionId && { wechatUnionId }),
            },
            { transaction },
          );
          invalidateUserCache(me.id);
          invalidateUserCache(existing.id);
        }
      }
    });
  });

export default router({
  sendVerificationToken,
  set,
});
