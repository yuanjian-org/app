import { procedure, router } from "../trpc";
import { authUser } from "../auth";
import { z } from "zod";
import db from "../database/db";
import { generalBadRequestError, notFoundError } from "api/errors";
import {
  formatLongLivedTokenForReadability,
  generateLongLivedToken
} from "shared/token";
import {
  canAcceptMergeToken,
  canIssueMergeToken,
  mergeTokenMaxAgeInHours,
} from "shared/merge";
import sequelize from "api/database/sequelize";
import { invalidateUserCache } from "pages/api/auth/[...nextauth]";
import { formatUserName, toChinese } from "shared/strings";
import { email as sendEmail } from "../sendgrid";
import getBaseUrl from "shared/getBaseUrl";
import { RoleProfiles } from "shared/Role";

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
        token: formatLongLivedTokenForReadability(token),
        tokenMaxAgeInHours: toChinese(mergeTokenMaxAgeInHours),
      },
    }];
  
    await sendEmail("d-8933c38afe8144799233d10163675b88", personalizations,
      getBaseUrl());
  });
});

const merge = procedure
  .use(authUser())
  .input(z.object({ token: z.string() }))
  .mutation(async ({ ctx: { user }, input: { token } }) =>
{
  const error = (message: string) => {
    console.error("Merge token validation failed: ", message);
    // Do not leak the actual error message to the client.
    return generalBadRequestError("微信激活码无效或者已经过期。");
  };

  await sequelize.transaction(async transaction => {
    /**
     * Validate the token.
     */
    const mt = await db.MergeToken.findOne({
      where: { token },
      attributes: ["id", "expiresAt"],
      include: [{ model: db.User, attributes: ["id", "email", "mergedTo"] }],
      transaction,
    });
    if (!mt) {
      throw error(`merge token "${token}" not found`);
    } else if (mt.expiresAt < new Date()) {
      throw error(`merge token "${token}" expired`);
    } else if (!canIssueMergeToken(mt.user.email)) {
      throw error(`user ${mt.user.id} cannot issue merge token`);
    } else if (mt.user.mergedTo) {
      throw error(`BUGBUG: user ${mt.user.id} is already merged, ` +
        `which should not happen due to the canAcceptMergeToken() check ` +
        `below. Please debug this inconsistency.`);
    }

    const me = await db.User.findByPk(user.id, {
      attributes: ["id", "wechatUnionId", "mergedTo"],
      transaction,
    });
    if (!me) {
      throw notFoundError("用户", user.id);
    } else if (!canAcceptMergeToken(user.email)) {
      throw error(`user ${user.id} cannot accept merge token`);
    } else if (!me.wechatUnionId) {
      throw error(`user ${user.id} has no wechat union id`);
    } else if (me.mergedTo) {
      throw error(`user ${user.id} is already merged`);
    }

    /**
     * Perform the merge.
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
});

export default router({
  emailMergeToken,
  merge,
});
