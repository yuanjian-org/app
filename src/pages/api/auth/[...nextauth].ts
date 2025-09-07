import NextAuth, { NextAuthOptions } from "next-auth";
import SequelizeAdapter from "../../../api/database/sequelize-adapter-src";
import sequelize from "../../../api/database/sequelize";
import db from "../../../api/database/db";
import { SendVerificationRequestParams } from "next-auth/providers";
import { emailRoleIgnoreError, email } from "../../../api/email";
import { toChineseNumber } from "../../../shared/strings";
import {
  userAttributes,
  userInclude,
} from "../../../api/database/models/attributesAndIncludes";
import invariant from "tiny-invariant";
import User from "../../../api/database/models/User";
import { LRUCache } from "lru-cache";
import getBaseUrl from "../../../shared/getBaseUrl";
import { isPermitted } from "../../../shared/Role";
import { noPermissionError } from "../../../api/errors";
import WeChatProvider from "./WeChatProvider";
import { generateShortLivedToken } from "../../../shared/token";
import { NextApiRequest, NextApiResponse } from "next";
import { compare } from "bcryptjs";

declare module "next-auth" {
  interface Session {
    // TODO: Remove `user` and use `me` instead.
    user: User;
    impersonated: true | undefined;
  }
}

export type ImpersonationRequest = {
  // The ID of the user to impersonate, or `null` to stop impersonation.
  impersonate: string | null;
};

const impersonateTokenKey = "imp";

export const authTokenMaxAgeInMins = 5;

export const adapter = SequelizeAdapter(sequelize, {
  // `as any` is because SequelizeAdapter requires user.email to be non-nullable
  models: { User: db.User as any },
});

export function authOptions(req?: NextApiRequest): NextAuthOptions {
  return {
    adapter,

    session: {
      strategy: "jwt",
    },

    providers: [
      {
        id: "credentials",
        name: "密码登录",
        type: "credentials",

        // We don't use this field but it's required by NextAuth.
        credentials: {},

        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) return null;
          const user = await db.User.findOne({
            where: { email: credentials.email },
            attributes: [...userAttributes, "password"],
            include: userInclude,
          });
          if (!user || !user.password) return null;
          const match = await compare(credentials.password, user.password);
          return match ? user : null;
        },
      },

      // @ts-expect-error
      {
        id: "sendgrid",
        type: "email",
        maxAge: authTokenMaxAgeInMins * 60, // For verification token expiry
        sendVerificationRequest,
        generateVerificationToken: generateShortLivedToken,
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
    ],

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
          if (impersonate === null) {
            delete token[impersonateTokenKey];
          } else {
            // https://www.ietf.org/id/draft-knauer-secure-webhook-token-00.html#name-jwt-structure
            // TODO: Trace to the actual user if this user is merged.
            const me = await db.User.findByPk(token.sub, {
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

        session.user = actual;
        if (impersonate) session.impersonated = true;
        return session;
      },
    },

    events: {
      createUser: (message) =>
        emailRoleIgnoreError(
          "UserManager",
          "新用户注册",
          `邮箱：${message.user.email}`,
          "",
        ),
    },
  };
}

// https://next-auth.js.org/configuration/initialization#advanced-initialization
export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  return await NextAuth(req, res, authOptions(req));
}

async function sendVerificationRequest({
  identifier,
  url,
  token,
}: SendVerificationRequestParams) {
  await email(
    [identifier],
    "E_114709011649",
    {
      url,
      token,
      tokenMaxAgeInMins: toChineseNumber(authTokenMaxAgeInMins),
    },
    getBaseUrl(),
  );
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
    invariant(user);
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
