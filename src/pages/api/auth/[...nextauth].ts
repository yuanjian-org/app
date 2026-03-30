import NextAuth, { NextAuthOptions } from "next-auth";
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
import { NextApiRequest, NextApiResponse } from "next";
import { adapter } from "../../../api/auth/adapter";
import providers from "../../../api/auth/providers";

declare module "next-auth" {
  interface Session {
    me: User;
    impersonated: true | undefined;
    // The logout URL for the identity provider if the user signed in via SSO.
    federatedLogoutUrl?: string;
  }
}

export type ImpersonationRequest = {
  // The ID of the user to impersonate, or `null` to stop impersonation.
  impersonate: string | null;
};

const impersonateTokenKey = "imp";

export { adapter };

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
      redirect({ url, baseUrl }) {
        if (url.startsWith("/")) return new URL(url, baseUrl).toString();
        try {
          const urlOrigin = new URL(url).origin;
          if (urlOrigin === baseUrl) return url;
          if (
            process.env.AUTH_YUANTU_SSO_ISSUER &&
            urlOrigin === new URL(process.env.AUTH_YUANTU_SSO_ISSUER).origin
          ) {
            return url;
          }
        } catch {
          // Invalid URL, fall through to default.
        }
        return baseUrl;
      },

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

      async jwt({ token, trigger, session, account }) {
        // The 'account' object is only present on the very first sign in.
        // We persist the provider in the token so we can check it in subsequent requests.
        if (account) {
          token.provider = account.provider;
        }

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
            // https://www.ietf.org/id/draft-knauer-secure-webhook-token-00.html#name-jwt-structure
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
        // If the user signed in with yuantu-sso, expose the IdP's logout endpoint
        // so the frontend can redirect the user there upon logging out.
        if (
          token.provider === "yuantu-sso" &&
          process.env.AUTH_YUANTU_SSO_ISSUER
        ) {
          const issuer = process.env.AUTH_YUANTU_SSO_ISSUER.replace(/\/+$/, "");
          session.federatedLogoutUrl = `${issuer}/api/oauth2/logout`;
        }

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
