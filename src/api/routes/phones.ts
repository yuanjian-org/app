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
  .mutation(async ({ input: { phone }, ctx: { user } }) => {
    await sequelize.transaction(async (transaction) => {
      const existing = await db.PhoneVerificationToken.findByPk(user.id, {
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
        { userId: user.id, phone, token },
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

const set = procedure
  .use(authUser())
  .input(
    z.object({
      phone: z.string(),
      token: z.string(),
    }),
  )
  .mutation(async ({ input: { phone, token }, ctx: { user } }) => {
    await sequelize.transaction(async (transaction) => {
      const tocken = await db.PhoneVerificationToken.findOne({
        where: { userId: user.id, phone, token },
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

      const existing = await db.User.count({
        where: { phone, id: { [Op.ne]: user.id } },
        transaction,
      });
      if (existing > 0) {
        throw generalBadRequestError("手机号已被其他账号使用。");
      }

      await tocken.destroy({ transaction });
      await user.update({ phone }, { transaction });
      invalidateUserCache(user.id);
    });
  });

export default router({
  sendVerificationToken,
  set,
});
