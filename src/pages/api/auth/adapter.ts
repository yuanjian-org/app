import SequelizeAdapter from "../../../api/database/sequelize-adapter-src";
import sequelize from "../../../api/database/sequelize";
import db from "../../../api/database/db";
import {
  userAttributes,
  userInclude,
} from "../../../api/database/models/attributesAndIncludes";
import {
  wechatFakeEmailDomain,
  ssoFakeEmailDomain,
  email2UnionId,
  email2SsoUserId,
} from "./utils/fakeEmail";

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
    wechatUnionId?: string;
    ssoUserId?: string;
    phone?: string;
    name?: string;
  }) {
    if (user.email.endsWith(wechatFakeEmailDomain)) {
      console.log("adapter.createUser(wechat):", user.wechatUnionId);
      return await db.User.create({ wechatUnionId: user.wechatUnionId });
    } else if (user.email.endsWith(ssoFakeEmailDomain)) {
      console.log("adapter.createUser(sso):", user.ssoUserId);
      return await db.User.create({
        ssoUserId: user.ssoUserId,
        phone: user.phone || null,
        name: user.name || null,
      });
    }
    throw new Error(`Invalid email domain for creation: ${user.email}`);
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
