import NextAuth, { NextAuthOptions } from "next-auth";
import SequelizeAdapter from "../../../api/database/sequelize-adapter-src";
import sequelize from "../../../api/database/sequelize";
import db from "../../../api/database/db";
import {
  userAttributes,
  userInclude,
} from "../../../api/database/models/attributesAndIncludes";
import invariant from "../../../shared/invariant";
import User from "../../../api/database/models/User";
import { LRUCache } from "lru-cache";
import { isPermitted } from "../../../shared/Role";
import { noPermissionError } from "../../../api/errors";
import WeChatProvider, {
  email2UnionId,
  email2SsoUserId,
  wechatFakeEmailDomain,
  ssoFakeEmailDomain,
  ssoUserId2Email,
} from "./WeChatProvider";
import { NextApiRequest, NextApiResponse } from "next";
import { compare } from "bcryptjs";
import { checkAndDeleteIdToken } from "../../../api/checkAndDeleteIdToken";
import { IdType } from "../../../shared/IdType";
import { TokenSet } from "openid-client";

declare module "next-auth" {
  interface Session {
    me: User;
    impersonated: true | undefined;
  }
}

export type ImpersonationRequest = {
  // The ID of the user to impersonate, or `null` to stop impersonation.
  impersonate: string | null;
};

const impersonateTokenKey = "imp";

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
  providers.push({
    id: "yuantu-sso",
    name: "YuanTu SSO",
    type: "oauth",
    // Our in-house OAuth2 provider signs id_token with HS256 (shared client
    // secret),
    // so we must override openid-client's RS256 default expectation.
    client: { id_token_signed_response_alg: "HS256" },
    clientId: process.env.AUTH_YUANTU_SSO_CLIENT_ID,
    clientSecret: process.env.AUTH_YUANTU_SSO_CLIENT_SECRET,
    issuer: yuantuSsoIssuer,
    // We need this option to allow next-auth to link  accounts that share the
    // same user id on the sso server.
    allowDangerousEmailAccountLinking: true,
    authorization: {
      url: `${yuantuSsoIssuer}/api/oauth2/authorize`,
      params: { scope: "openid profile email phone" },
    },
    token: { url: `${yuantuSsoIssuer}/api/oauth2/token` },
    userinfo: {
      url: `${yuantuSsoIssuer}/api/oauth2/userinfo`,
      // NextAuth otherwise uses only id_token claims for the profile when
      // `idToken` is enabled. Our id_token carries `sub` only; additional
      // fields such as name and phone number come from the OIDC userinfo
      // response (see `oauth2/userinfo.ts`).
      request({ client, tokens }) {
        return client.userinfo(
          tokens instanceof TokenSet ? tokens : new TokenSet(tokens),
        );
      },
    },
    checks: ["pkce", "state"],
    profile(profile) {
      // For more information on why we encode the ssoUserId into the email,
      // see WeChatProvider.profile() function.
      return {
        id: profile.sub,
        ssoUserId: profile.sub,
        email: ssoUserId2Email(profile.sub),
        name: profile.name ?? undefined,
        phone: profile.phone_number ?? undefined,
      };
    },
  });
}

export function authOptions(req?: NextApiRequest): NextAuthOptions {
  return {
    // @ts-expect-error
    adapter,

    session: {
      strategy: "jwt",
    },

    providers,

    pages: {
      signIn: "/auth/login",
      // The login page respects the `?error=` URL param.
      error: "/auth/login",
    },

    // https://next-auth.js.org/configuration/callbacks
    callbacks: {
      signIn: ({ account }) => {
        // https://github.com/nextauthjs/next-auth/discussions/469
        if (account?.provider === "embedded-wechat-qr") {
          // https://next-auth.js.org/configuration/options#cookies
          const csrf =
            req?.cookies?.["__Host-next-auth.csrf-token"]?.split("|")[0];
          const state = req?.query?.state;
          if (csrf === state) {
            return true;
          } else {
            console.error(
              "WeChat QR OAuth state is illegal, csrf:",
              csrf,
              "state:",
              state,
            );
            return false;
          }
        } else {
          return true;
        }
      },

      async jwt({ token, trigger, session }) {
        // Handle session updates.
        // https://next-auth.js.org/getting-started/client#updating-the-session
        if (trigger == "update" && session) {
          const impersonate = (session as ImpersonationRequest).impersonate;
          if (impersonate === undefined) {
            return token;
          }
          if (impersonate === null) {
            delete token[impersonateTokenKey];
          } else {
            // https://www.ietf.org/id/draft-knauer-secure-webhook-
            // token-00.html#name-jwt-structure
            const original = await db.User.findByPk(token.sub, {
              attributes: ["roles", "mergedTo"],
            });
            invariant(original, "original not found");

            const me = !original.mergedTo
              ? original
              : await db.User.findByPk(original.mergedTo, {
                  attributes: ["roles"],
                });
            invariant(me, "me not found");

            if (!isPermitted(me.roles, "UserManager")) {
              throw noPermissionError("用户", impersonate);
            }
            token[impersonateTokenKey] = impersonate;
          }
        }

        return token;
      },

      async session({ token, session }) {
        const impersonate = token[impersonateTokenKey] as string | undefined;
        const id = impersonate ?? token.sub;
        invariant(id, "id not found");

        const original = await userCache.fetch(id);
        invariant(original, "original not found");

        const actual = !original.mergedTo
          ? original
          : await userCache.fetch(original.mergedTo);
        invariant(actual, "actual not found");

        session.me = actual;
        if (impersonate) session.impersonated = true;
        return session;
      },
    },
  };
}

// https://next-auth.js.org/configuration/initialization#advanced-initialization
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  return await NextAuth(req, res, authOptions(req));
}

const userCache = new LRUCache<string, User>({
  max: 1000,
  // The TTL should not too short so most consecutive requests from a page load
  // should get a hit. It should not be too long to keep staleness in reasonable
  // control.
  ttl: 5 * 1000, // 5 sec
  // Do not update age so that no matter how eagerly users refreshes the page
  // the data is guaranteed to be fresh after TTL passes.
  // updateAgeOnGet: true,

  fetchMethod: async (id: string) => {
    const user = await db.User.findByPk(id, {
      attributes: [...userAttributes, "mergedTo"],
      include: userInclude,
    });
    // next-auth must have already created the user.
    invariant(user, `user not found: ${id}`);
    return user;
  },
});

/**
 * Call this method at all the places where fields in `userAttributes` are
 * updated.
 */
export function invalidateUserCache(userId: string) {
  userCache.delete(userId);
}
