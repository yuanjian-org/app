import { procedure, router } from "../trpc";
import { z } from "zod";
import db from "../database/db";
import { Op, Transaction } from "sequelize";
import { ip, authUser } from "../auth";
import {
  chinaPhonePrefix,
  isValidPassword,
  toChineseNumber,
} from "../../shared/strings";
import { hash } from "bcryptjs";
import { generalBadRequestError } from "../errors";
import sequelize from "../database/sequelize";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import {
  tokenMaxAgeInMins,
  tokenMinSendIntervalInSeconds,
  generateToken,
} from "../../shared/token";
import { idTokenInternationalSmsTemplateId, sms } from "../sms";
import moment from "moment";
import invariant from "../../shared/invariant";
import { IdType, zIdType } from "../../shared/IdType";
import getBaseUrl from "../../shared/getBaseUrl";
import { email } from "../../api/email";
import { checkAndDeleteIdToken } from "../../api/checkAndDeleteIdToken";
import _ from "lodash";
import { roleProfile } from "shared/Role";
/**
 * Send verfication token to the specified phone or email.
 */
const send = procedure
  .use(ip())
  .input(z.object({ idType: zIdType, id: z.string() }))
  .mutation(async ({ input: { idType, id }, ctx: { ip } }) => {
    if (
      idType === "phone" &&
      !id.startsWith(chinaPhonePrefix) &&
      !id.startsWith("+1") &&
      !id.startsWith("+39")
    ) {
      throw generalBadRequestError(
        "目前尚不支持您所在地区的手机号。如需使用，请联系客服。",
      );
    }

    await sequelize.transaction(async (transaction) => {
      const idField = idType === "phone" ? "phone" : "email";
      /**
       * Rate limit. Note that once the user successfully consume a token, the
       * rate limit will be reset.
       */
      const last = await db.IdToken.findOne({
        where: { ip, [idField]: { [Op.ne]: null } },
        attributes: ["updatedAt"],
        order: [["updatedAt", "DESC"]],
        transaction,
      });
      if (
        last &&
        moment().diff(last.updatedAt, "seconds") < tokenMinSendIntervalInSeconds
      ) {
        throw generalBadRequestError("验证码发送过于频繁，请稍后再试。");
      }

      const token = await generateToken();
      await db.IdToken.upsert({ ip, [idField]: id, token }, { transaction });

      if (idType === "phone") {
        await sms("yaD264", idTokenInternationalSmsTemplateId, [
          {
            to: id,
            vars: {
              token: token.toString(),
              tokenMaxAgeInMins: toChineseNumber(tokenMaxAgeInMins),
            },
          },
        ]);
      } else {
        await email(
          [id],
          "E_114709011649",
          {
            token,
            tokenMaxAgeInMins: toChineseNumber(tokenMaxAgeInMins),
          },
          getBaseUrl(),
        );
      }
    });
  });

/**
 * The frontend should call `update` in `useSession()` to update the session as
 * soon as this route returns, because this route may merge the current user
 * with another user.
 */
const setPhone = procedure
  .use(authUser())
  .input(
    z.object({
      phone: z.string(),
      token: z.string(),
    }),
  )
  .mutation(async ({ input: { phone, token }, ctx: { me } }) => {
    await sequelize.transaction(async (transaction) => {
      await checkAndDeleteIdToken("phone", phone, token, transaction);

      const existing = await db.User.findOne({
        attributes: ["id"],
        where: { phone, id: { [Op.ne]: me.id } },
        transaction,
      });

      if (!existing) {
        await updateMyPhoneAndPreference(me.id, me.phone, phone, transaction);
        invalidateUserCache(me.id);
      } else {
        if (me.phone) {
          // If the current user already has a phone number, account merge would
          // cause data loss or inconsistency if we don't carefully merge all
          // the data associated with the two accounts. So we disallow it.
          // Note that the user's new phone number may be the same as their
          // existing number. We throw the same error in this case.
          throw generalBadRequestError("手机号已经被使用。");
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

          // Get user password. A user may have a password prior to setting up
          // an account. Also get fresh email and wechatUnionId becaue why not.
          const me2 = await db.User.findByPk(me.id, {
            attributes: ["email", "wechatUnionId", "password"],
            transaction,
          });
          invariant(me2, "User not found");
          const email = me2.email;
          const wechatUnionId = me2.wechatUnionId;
          const password = me2.password;

          await me.update(
            {
              email: null,
              wechatUnionId: null,
              password: null,
              resetToken: null,
              resetTokenExpiresAt: null,
              mergedTo: existing.id,
            },
            { transaction },
          );
          await existing.update(
            {
              ...(email && { email }),
              ...(wechatUnionId && { wechatUnionId }),
              ...(password && { password }),
            },
            { transaction },
          );
          invalidateUserCache(me.id);
          invalidateUserCache(existing.id);
        }
      }
    });
  });

export async function updateMyPhoneAndPreference(
  myId: string,
  oldPhone: string | null,
  phone: string,
  transaction: Transaction,
) {
  // Disable SMS notifications by default for non-Chinese phone numbers becuase
  // people outside mainland China are more likely to use email as their primary
  // communication channel.
  //
  // If the user already has a phone number, do not disable SMS notifications
  // to maintain the existing behavior.
  if (phone.startsWith(chinaPhonePrefix) || oldPhone) {
    await db.User.update({ phone }, { where: { id: myId }, transaction });
  } else {
    const me = await db.User.findByPk(myId, {
      attributes: ["id", "preference"],
      transaction,
    });
    invariant(me, `User not found: ${myId}`);
    const smsDisabled = _.union(me.preference?.smsDisabled ?? [], ["基础"]);

    await me.update(
      { phone, preference: { ...me.preference, smsDisabled } },
      { transaction },
    );
  }
}

const resetPassword = procedure
  .input(
    z.object({
      idType: zIdType,
      id: z.string(),
      token: z.string(),
      password: z.string(),
    }),
  )
  .mutation(async ({ input: { idType, id, token, password } }) => {
    if (!isValidPassword(password)) {
      throw generalBadRequestError("密码不合要求。");
    }
    // Keep this slow function outside the transaction.
    const hashed = await hash(password, 10);

    await sequelize.transaction(async (transaction) => {
      await resetPasswordImpl(idType, id, token, hashed, transaction);
    });
  });

export async function resetPasswordImpl(
  idType: IdType,
  id: string,
  token: string,
  hashedPassword: string,
  transaction: Transaction,
) {
  const idField = idType === "phone" ? "phone" : "email";

  await checkAndDeleteIdToken(idType, id, token, transaction);
  let user = await db.User.findOne({
    where: { [idField]: id },
    attributes: ["id", "roles"],
    transaction,
  });

  if (user) {
    if (
      user.roles &&
      user.roles.some((role) => roleProfile(role).privilegedUserDataAccess)
    ) {
      throw generalBadRequestError("特权用户禁止使用密码登录。");
    }
  } else {
    user = await db.User.create({ [idField]: id }, { transaction });
  }

  await user.update({ password: hashedPassword }, { transaction });
}

export default router({
  send,
  setPhone,
  resetPassword,
});
