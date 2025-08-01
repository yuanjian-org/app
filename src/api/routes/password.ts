import { procedure, router } from "../trpc";
import { z } from "zod";
import crypto from "crypto";
import sequelize from "api/database/sequelize";
import { createUser } from "./users";
import { tokenMaxAgeInMins } from "pages/api/auth/[...nextauth]";
import { isValidPassword, toChineseNumber } from "shared/strings";
import getBaseUrl from "shared/getBaseUrl";
import { email as sendEmail } from "api/email";
import db from "api/database/db";
import { hash } from "bcryptjs";
import { generalBadRequestError } from "api/errors";
import { Op } from "sequelize";

const requestReset = procedure
  .input(
    z.object({
      email: z.string().email(),
    }),
  )
  .mutation(async ({ input: { email } }) => {
    const token = crypto.randomBytes(32).toString("base64url");

    await sequelize.transaction(async (transaction) => {
      await createUser(
        {
          email,
          resetToken: token,
          resetTokenExpiresAt: new Date(
            Date.now() + 1000 * 60 * tokenMaxAgeInMins,
          ),
        },
        transaction,
        "upsert",
      );

      await sendEmail(
        [email],
        "E_114707073154",
        {
          // No need to use URL encoding because the code above guarantees URL
          // safety of both token and email.
          url: `${getBaseUrl()}/auth/password?token=${token}&email=${email}`,
          token,
          tokenMaxAgeInMins: toChineseNumber(tokenMaxAgeInMins),
        },
        getBaseUrl(),
      );
    });
  });

const reset = procedure
  .input(
    z.object({
      token: z.string(),
      password: z.string(),
    }),
  )
  .mutation(async ({ input: { token, password } }) => {
    if (!isValidPassword(password)) {
      throw generalBadRequestError("密码不合要求。");
    }

    const hashed = await hash(password, 10);

    await sequelize.transaction(async (transaction) => {
      const user = await db.User.findOne({
        where: {
          resetToken: token,
          resetTokenExpiresAt: { [Op.gt]: new Date() },
        },
        lock: true,
        transaction,
      });
      if (!user) throw generalBadRequestError("密码链接无效或已过期。");

      await user.update(
        {
          password: hashed,
          resetToken: null,
          resetTokenExpiresAt: null,
        },
        { transaction },
      );
    });
  });

export default router({
  requestReset,
  reset,
});
