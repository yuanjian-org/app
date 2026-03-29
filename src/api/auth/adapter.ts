import SequelizeAdapter from "../database/sequelize-adapter-src";
import sequelize from "../database/sequelize";
import db from "../database/db";
import {
  userAttributes,
  userInclude,
} from "../database/models/attributesAndIncludes";
import {
  wechatFakeEmailDomain,
  ssoFakeEmailDomain,
  email2UnionId,
  email2SsoUserId,
} from "./fakeEmail";
import { checkAndComputeUserFields } from "api/routes/checkAndComputeUserFields";

export const adapter = {
  ...SequelizeAdapter(sequelize, {
    // `as any` is because SequelizeAdapter requires user.email to be
    // non-nullable
    models: { User: db.User as any },
  }),

  // We use custom `createUser` logic because we process sign-ups differently
  // depending on the fake email domain. For WeChat, we only care about
  // `wechatUnionId`.
  // For SSO, we create the user with `ssoUserId` along with their standard
  // profile.
  async createUser(user: {
    email: string;
    realEmail?: string;
    phone?: string;
    name?: string;
  }) {
    if (user.email.endsWith(wechatFakeEmailDomain)) {
      const wechatUnionId = email2UnionId(user.email);
      console.log("adapter.createUser(wechat):", wechatUnionId);
      return await db.User.create({ wechatUnionId });
    } else if (user.email.endsWith(ssoFakeEmailDomain)) {
      const ssoUserId = email2SsoUserId(user.email);
      console.log("adapter.createUser(sso):", ssoUserId);
      return await sequelize.transaction(async (transaction) => {
        const fields = await checkAndComputeUserFields({
          email: user.realEmail || undefined,
          name: user.name || undefined,
          isVolunteer: false,
          oldUrl: null,
          transaction,
        });
        return await db.User.create({
          ...fields,
          ssoUserId,
          phone: user.phone || null,
          transaction,
        });
      });
    } else {
      throw new Error(`Invalid email domain for creation: ${user.email}`);
    }
  },

  async getUserByEmail(email: string) {
    if (email.endsWith(wechatFakeEmailDomain)) {
      const wechatUnionId = email2UnionId(email);
      console.log(`adapter.getUserByEmail(wechat): ${wechatUnionId}`);
      return await db.User.findOne({
        where: { wechatUnionId },
        attributes: userAttributes,
        include: userInclude,
      });
    } else if (email.endsWith(ssoFakeEmailDomain)) {
      const ssoUserId = email2SsoUserId(email);
      console.log(`adapter.getUserByEmail(sso): ${ssoUserId}`);
      return await db.User.findOne({
        where: { ssoUserId },
        attributes: userAttributes,
        include: userInclude,
      });
    }
    return null;
  },
};
