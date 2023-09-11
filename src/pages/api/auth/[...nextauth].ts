import NextAuth, { NextAuthOptions } from "next-auth";
import SequelizeAdapter from "@auth/sequelize-adapter";
import sequelizeInstance from "api/database/sequelizeInstance";
import db from "../../../api/database/db";

export const adapter = SequelizeAdapter(sequelizeInstance, {
  models: { User: db.User },
});

async function sendVerificationRequest(params: any): Promise<void> {
  console.log(">>>>", params);
}

const options: NextAuthOptions = {
  adapter,
  providers: [
    // @ts-expect-error
    {
      id: 'sendgrid',
      type: 'email',
      sendVerificationRequest,
    }
  ],
};

export default NextAuth(options);
