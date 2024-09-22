import NextAuth, { NextAuthOptions } from "next-auth";
import SequelizeAdapter from "../../../api/database/sequelize-adapter-src";
import sequelize from "../../../api/database/sequelize";
import db from "../../../api/database/db";
import { SendVerificationRequestParams } from "next-auth/providers";
import { email as sendEmail, emailRoleIgnoreError } from "../../../api/sendgrid";
import randomNumber from "random-number-csprng";
import { toChinese } from "../../../shared/strings";
import { userAttributes, userInclude } from "../../../api/database/models/attributesAndIncludes";
import invariant from "tiny-invariant";
import User from "../../../api/database/models/User";
import { LRUCache } from "lru-cache";

// The default session user would cause type error when using session user data
declare module "next-auth" {
  interface Session {
    user: User;
  }
}

const tokenMaxAgeInMins = 5;

export const adapter = SequelizeAdapter(sequelize, {
  models: { User: db.User },
});

export const authOptions: NextAuthOptions = {
  adapter,

  session: {
    maxAge: 365 * 24 * 60 * 60, // 365 days
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
    async session({ session }) {
      const user = await userCache.fetch(session.user.email);
      invariant(user);
      session.user = user;
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

async function sendVerificationRequest({ identifier: email, url, token }: SendVerificationRequestParams) {
  const personalizations = [{
    to: { email },
    dynamicTemplateData: { url, token, tokenMaxAgeInMins: toChinese(tokenMaxAgeInMins) },
  }];

  await sendEmail("d-4f7625f48f1c494a9e2e708b89880c7a", personalizations, new URL(url).origin);
}

const userCache = new LRUCache<string, User>({
  max: 1000,
  // The TTL should not too short so most consecutive requests from a page load should get a hit.
  // It should not be too long to keep stalenss in reasonable control.
  ttl: 5 * 1000,  // 5 sec
  // Do not update age so that no matter how eagerly users refreshes the page the data is guaranteed to be fresh after
  // TTL passes.
  // updateAgeOnGet: true,

  fetchMethod: async (email: string) => {
    const user = await db.User.findOne({
      where: { email },
      attributes: userAttributes,
      include: userInclude,
    });
    // next-auth must have already created the user.
    invariant(user);
    return user;
  }
});
