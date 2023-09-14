import NextAuth, { NextAuthOptions } from "next-auth";
import SequelizeAdapter from "@auth/sequelize-adapter";
import sequelizeInstance from "api/database/sequelizeInstance";
import db from "../../../api/database/db";
import { SendVerificationRequestParams } from "next-auth/providers";
import { email as sendEmail, emailRoleIgnoreError } from "../../../api/sendgrid";

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
      sendVerificationRequest,
    }
  ],

  pages: {
    signIn: '/auth/login',
    verifyRequest: '/auth/verify-request',
  },

  events: {
    createUser: async (message) => {
      await emailRoleIgnoreError("UserManager", "新用户注册", `${message.user.email} 注册新用户 。`, "");
    },
  }
};

export default NextAuth(authOptions);

async function sendVerificationRequest({ identifier: email, url }: SendVerificationRequestParams): Promise<void> {
  const personalizations = [{
    to: { email },
    dynamicTemplateData: { url },
  }];

  await sendEmail("d-4f7625f48f1c494a9e2e708b89880c7a", personalizations, new URL(url).origin);
}
