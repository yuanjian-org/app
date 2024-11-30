import NextAuth, { NextAuthOptions } from "next-auth";
import SequelizeAdapter from "../../../api/database/sequelize-adapter-src";
import sequelize from "../../../api/database/sequelize";
import db from "../../../api/database/db";
import { SendVerificationRequestParams } from "next-auth/providers";
import { email as sendEmail, emailRoleIgnoreError } from "../../../api/sendgrid";
import randomNumber from "random-number-csprng";
import { toChinese } from "../../../shared/strings";
import {
  userAttributes,
  userInclude,
} from "../../../api/database/models/attributesAndIncludes";
import invariant from "tiny-invariant";
import User from "../../../api/database/models/User";
import { LRUCache } from "lru-cache";
import getBaseUrl from '../../../shared/getBaseUrl';
import { isPermitted } from "../../../shared/Role";
import { noPermissionError } from "../../../api/errors";

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

const tokenMaxAgeInMins = 5;

export const adapter = SequelizeAdapter(sequelize, {
  models: { User: db.User },
});

export const authOptions: NextAuthOptions = {
  adapter,

  session: {
    strategy: "jwt",
  },

  providers: [
    // @ts-expect-error
    {
      id: 'sendgrid',
      type: 'email',
      maxAge: tokenMaxAgeInMins * 60, // For verification token expiry
      sendVerificationRequest,
      generateVerificationToken,
    }
  ],

  pages: {
    signIn: '/auth/login',
    // The login page respects the `?error=` URL param.
    error: '/auth/login',
  },

  callbacks: {
    async jwt({ token, trigger, session }) {
      // https://next-auth.js.org/getting-started/client#updating-the-session
      if (trigger == "update") {
        const req = session as ImpersonationRequest;
        if (req.impersonate === null) {
          delete token[impersonateTokenKey];
        } else {
          const me = await db.User.findByPk(token.sub);
          invariant(me);
          if (!isPermitted(me.roles, "UserManager")) {
            throw noPermissionError("用户", req.impersonate);
          }
          token[impersonateTokenKey] = req.impersonate;
        }
      }
      return token;
    },

    async session({ token, session }) {
      const impersonate = token[impersonateTokenKey];
      const id = (impersonate as string | undefined) ?? token.sub;
      invariant(id);
      const me = await userCache.fetch(id);
      invariant(me);
      session.user = me;
      if (impersonate) session.impersonated = true;
      return session;
    }
  },

  events: {
    createUser: message => emailRoleIgnoreError("UserManager", "新用户注册",
        `${message.user.email} 注册新用户 。`, ""),
  },
};

export default NextAuth(authOptions);

async function generateVerificationToken() {
  return (await randomNumber(100000, 999999)).toString();
}

async function sendVerificationRequest({ identifier: email, url, token }:
  SendVerificationRequestParams
) {
  const personalizations = [{
    to: { email },
    dynamicTemplateData: {
      url,
      token,
      tokenMaxAgeInMins: toChinese(tokenMaxAgeInMins),
    },
  }];

  await sendEmail("d-4f7625f48f1c494a9e2e708b89880c7a", personalizations,
    getBaseUrl());
}

const userCache = new LRUCache<string, User>({
  max: 1000,
  // The TTL should not too short so most consecutive requests from a page load
  // should get a hit. It should not be too long to keep staleness in reasonable
  // control.
  ttl: 5 * 1000,  // 5 sec
  // Do not update age so that no matter how eagerly users refreshes the page
  // the data is guaranteed to be fresh after TTL passes.
  // updateAgeOnGet: true,

  fetchMethod: async (id: string) => {
    const user = await db.User.findByPk(id, {
      attributes: userAttributes,
      include: userInclude,
    });
    // next-auth must have already created the user.
    invariant(user);
    return user;
  }
});
