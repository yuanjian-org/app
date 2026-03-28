import { NextAuthOptions } from "next-auth";
import db from "../../../api/database/db";
import sequelize from "../../../api/database/sequelize";
import {
  userAttributes,
  userInclude,
} from "../../../api/database/models/attributesAndIncludes";
import { compare } from "bcryptjs";
import { checkAndDeleteIdToken } from "../../../api/checkAndDeleteIdToken";
import { IdType } from "../../../shared/IdType";
import WeChatProvider from "./WeChatProvider";
import YuantuSsoProvider from "./YuantuSsoProvider";

const providers: NextAuthOptions["providers"] = [
  {
    id: "id-password",
    name: "手机/邮箱密码登录",
    type: "credentials",
    // We don't use this field but it's required by NextAuth.
    credentials: {},

    async authorize(credentials) {
      const { idType, id, password } = credentials ?? {};
      if (!idType || !id || !password) return null;
      const idField = idType === "phone" ? "phone" : "email";
      const user = await db.User.findOne({
        where: { [idField]: id },
        attributes: [...userAttributes, "password"],
        include: userInclude,
      });
      if (!user || !user.password) return null;
      const match = await compare(password, user.password);
      return match ? user : null;
    },
  },

  {
    id: "id-token",
    name: "手机/邮箱验证码登录",
    type: "credentials",
    // We don't use this field but it's required by NextAuth.
    credentials: {},

    async authorize(credentials) {
      const { idType, id, token } = credentials ?? {};
      if (!idType || !id || !token) return null;
      const idField = idType === "phone" ? "phone" : "email";
      return await sequelize.transaction(async (transaction) => {
        await checkAndDeleteIdToken(idType as IdType, id, token, transaction);
        let u = await db.User.findOne({
          where: { [idField]: id },
          attributes: userAttributes,
          include: userInclude,
          transaction,
        });
        if (!u) {
          u = await db.User.create({ [idField]: id }, { transaction });
        }
        return u;
      });
    },
  },

  WeChatProvider({
    id: "embedded-wechat-qr",
    name: "嵌入式微信扫码登陆",

    /**
     * This line is necessary because the current QR code login does not
     * follow the full next-auth auth flow, and the backend does not
     * generate a state. Removing this would cause the check to fail
     * preventing login.
     *
     * We do manual checks in the signIn callback handler below.
     */
    checks: ["none"],

    clientId: process.env.AUTH_WECHAT_QR_APP_ID!,
    clientSecret: process.env.AUTH_WECHAT_QR_APP_SECRET!,
    platformType: "WebsiteApp",
  }),

  WeChatProvider({
    id: "wechat-qr",
    name: "微信扫码登陆",
    clientId: process.env.AUTH_WECHAT_QR_APP_ID!,
    clientSecret: process.env.AUTH_WECHAT_QR_APP_SECRET!,
    platformType: "WebsiteApp",
  }),

  WeChatProvider({
    id: "wechat",
    name: "微信内登陆",
    clientId: process.env.AUTH_WECHAT_APP_ID!,
    clientSecret: process.env.AUTH_WECHAT_APP_SECRET!,
    platformType: "OfficialAccount",
  }),
];

// Remove trailing slash
const yuantuSsoIssuer = process.env.AUTH_YUANTU_SSO_ISSUER?.replace(/\/+$/, "");

if (
  process.env.AUTH_YUANTU_SSO_CLIENT_ID &&
  process.env.AUTH_YUANTU_SSO_CLIENT_SECRET &&
  yuantuSsoIssuer
) {
  providers.push(
    YuantuSsoProvider({
      clientId: process.env.AUTH_YUANTU_SSO_CLIENT_ID,
      clientSecret: process.env.AUTH_YUANTU_SSO_CLIENT_SECRET,
      issuer: yuantuSsoIssuer,
    }),
  );
}

export default providers;
