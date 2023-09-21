import NextAuth, { NextAuthOptions } from "next-auth";
import SequelizeAdapter from "@auth/sequelize-adapter";
import sequelizeInstance from "api/database/sequelizeInstance";
import db from "../../../api/database/db";
import { SendVerificationRequestParams } from "next-auth/providers";
import { email as sendEmail, emailRoleIgnoreError } from "../../../api/sendgrid";
import randomNumber from "random-number-csprng";
import { toChinese } from "shared/strings";
import { userAttributes } from "api/database/models/attributesAndIncludes";
import invariant from "tiny-invariant";
import User from "api/database/models/User";

// The default session user would cause type error when using session user data
declare module "next-auth" {
  interface Session {
    user: User;
  }
}

const tokenMaxAgeInMins = 5;

export const authOptions: NextAuthOptions = {
  adapter: SequelizeAdapter(sequelizeInstance, {
    models: { User: db.User },
  }),

  session: {
    maxAge: 90 * 24 * 60 * 60, // 90 days
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
      const user = await db.User.findOne({
        where: { email: session.user.email },
        attributes: userAttributes,
      });
      invariant(user);
      session.user = user;

      return session;
    }
  },

  events: {
    createUser: async (message) => {
      await emailRoleIgnoreError("UserManager", "新用户注册", `${message.user.email} 注册新用户 。`, "");
    },
  }
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
