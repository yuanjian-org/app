import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { generalBadRequestError, notFoundError } from "api/errors";
import {
  formatCopyableLongLivedToken,
  formatReadableLongLivedToken,
  generateLongLivedToken,
} from "shared/token";
import {
  canAcceptMergeToken,
  canIssueMergeToken,
  mergeTokenMaxAgeInHours,
} from "shared/merge";
import sequelize from "api/database/sequelize";
import { invalidateUserCache } from "pages/api/auth/[...nextauth]";
import { compareDate, formatUserName, toChinese } from "shared/strings";
import { email, emailRoleIgnoreError } from "../sendgrid";
import getBaseUrl from "shared/getBaseUrl";
import { RoleProfiles } from "shared/Role";
import { Transaction } from "sequelize";
import { MergeTokenErrorEvent, zMergeTokenErrorEvent } from "shared/EventLog";

const emailMergeToken = procedure
  .use(authUser("UserManager"))
  .input(z.object({
    userId: z.string(),
  }))
  .mutation(async ({ ctx, input: { userId } }) =>
{
  return await sequelize.transaction(async transaction => {
    const u = await db.User.findByPk(userId, {
      attributes: ["mergedTo", "name", "email"],
      transaction,
    });
    if (!u) throw notFoundError("用户", userId);

    if (!canIssueMergeToken(u.email) || u.mergedTo) {
      throw generalBadRequestError("此用户不能发起合并请求。");
    }

    const token = await generateLongLivedToken();
    const ttl = mergeTokenMaxAgeInHours * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttl);

    // Delete any existing merge token for this user.
    await db.MergeToken.destroy({
      where: { userId },
      transaction,
    });

    await db.MergeToken.create(
      { token, expiresAt, userId },
      { transaction },
    );

    const name = formatUserName(u.name, "friendly");
    const personalizations = [{
      to: {
        email: u.email,
        name,
      },
      dynamicTemplateData: {
        name,
        userManagerRole: RoleProfiles.UserManager.displayName,
        senderName: formatUserName(ctx.user.name, "formal"),
        readableToken: formatReadableLongLivedToken(token),
        copyableToken: formatCopyableLongLivedToken(token),
        tokenMaxAgeInHours: toChinese(mergeTokenMaxAgeInHours),
      },
    }];
  
    await email("d-8933c38afe8144799233d10163675b88", personalizations,
      getBaseUrl());
  });
});

const merge = procedure
  .use(authUser())
  .input(z.object({ token: z.string() }))
  .mutation(async ({ ctx: { user }, input: { token } }) =>
{
  const exception = await sequelize.transaction(async transaction => {
    /**
     * Limit rate
     */
    const ex = await limitRate(user.id, token, transaction);
    if (ex) return ex;

    /**
     * Validate token
     */
    const mt = await db.MergeToken.findOne({
      where: { token: token.toLowerCase() },
      attributes: ["id", "expiresAt"],
      include: [{ model: db.User, attributes: ["id", "email", "mergedTo"] }],
      transaction,
    });
    if (!mt) {
      return logMergeTokenError(user.id, token,
        "token not found", transaction);
    } else if (compareDate(mt.expiresAt, new Date()) > 0) {
      return logMergeTokenError(user.id, token,
        "expired", transaction);
    } else if (!canIssueMergeToken(mt.user.email)) {
      return logMergeTokenError(user.id, token, 
        `user ${mt.user.id} cannot issue merge token`, transaction);
    } else if (mt.user.mergedTo) {
      return logMergeTokenError(user.id, token,
        `BUGBUG: user ${mt.user.id} is already merged ` +
        `which should not happen due to the canAcceptMergeToken() check ` +
        `below. Please debug this inconsistency.`, transaction);
    }

    const me = await db.User.findByPk(user.id, {
      attributes: ["id", "wechatUnionId", "mergedTo"],
      transaction,
    });
    if (!me) {
      return logMergeTokenError(user.id, token,
        `user not found`, transaction);
    } else if (!canAcceptMergeToken(user.email)) {
      return logMergeTokenError(user.id, token,
        `user cannot accept merge token`, transaction);
    } else if (!me.wechatUnionId) {
      return logMergeTokenError(user.id, token,
        `user has no wechat union id`, transaction);
    } else if (me.mergedTo) {
      return logMergeTokenError(user.id, token,
        `user is already merged`, transaction);
    }

    /**
     * Perform the merge
     */
    const wechatUnionId = me.wechatUnionId;

    await me.update({
      wechatUnionId: null,
      mergedTo: mt.user.id,
    }, { transaction });

    // Note that existing wechat union id will be overwritten.
    await mt.user.update({
      wechatUnionId,
    }, { transaction });

    await mt.destroy({ transaction });

    invalidateUserCache(mt.user.id);
    invalidateUserCache(user.id);
  });

  if (exception) throw exception;
});

/**
 * Limit the rate of merge token attempts to 5 per day.
 */
async function limitRate(userId: string, token: string,
  transaction: Transaction
) {
  const maxErrorAttemptsPerDay = 5;

  // Force type check
  const type: z.TypeOf<typeof zMergeTokenErrorEvent.shape.type> =
    "MergeTokenError";

  const count = await db.EventLog.count({
    where: sequelize.literal(`
      data ->> 'type' = '${type}' AND
      "userId" = '${z.string().uuid().parse(userId)}' AND 
      "createdAt" > NOW() - INTERVAL '1 day'
    `),
    transaction,
  });

  console.log(">>>>", count);
  if (count > maxErrorAttemptsPerDay) {
    emailRoleIgnoreError("SystemAlertSubscriber", "微信激活码尝试次数超限",
      `用户 ${userId} 的当日尝试次数已经超过 ${maxErrorAttemptsPerDay} 次`,
      getBaseUrl());

    return logMergeTokenError(userId, token, "exceeded rate limit", transaction,
      "已超过每日最大尝试次数。");
  }
}

async function logMergeTokenError(userId: string, token: string,
  error: string, transaction: Transaction, message?: string
) {
  console.error(
    `Log merge token error by user ${userId}: token ${token}: ${error}`);

  const data: MergeTokenErrorEvent = {
    type: "MergeTokenError",
    token,
    error,
  };
  await db.EventLog.create({ userId, data }, { transaction });

  // Do not leak the actual error message to the client.
  return generalBadRequestError(message ?? "激活码无效或者已经过期。");
}

export default router({
  emailMergeToken,
  merge,
});
