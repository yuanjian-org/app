import { procedure, router } from "../trpc";
import { z } from "zod";
import { addRole } from "../../shared/Role";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { authUser } from "../auth";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import { MenteeStatus } from "../../shared/MenteeStatus";
import invariant from "shared/invariant";
import User from "../../shared/User";
import { Transaction } from "sequelize";
import { setEmailImpl } from "./idTokens";
import { generalBadRequestError } from "api/errors";

export async function validateImpl(
  me: User,
  email: string,
  token: string,
  transaction: Transaction,
) {
  if (!email.endsWith("@mail.ustc.edu.cn")) {
    throw generalBadRequestError("邮箱必须是中科大邮箱。");
  }

  await setEmailImpl(me.id, email, token, transaction);

  const user = await db.User.findByPk(me.id, {
    attributes: ["id", "roles", "menteeStatus"],
    transaction,
  });
  invariant(user, `User not found: ${me.id}`);

  // Set the user's mentee status if it's null, same as for pearl students.
  const menteeStatus: MenteeStatus =
    user.menteeStatus === null ? "现届学子" : user.menteeStatus;

  await user.update(
    {
      roles: addRole(me.roles, "Mentee"),
      menteeStatus,
    },
    { transaction },
  );
}

const validate = procedure
  .use(authUser())
  .input(
    z.object({
      email: z.string().email(),
      token: z.string(),
    }),
  )
  .mutation(async ({ ctx: { me }, input }) => {
    await sequelize.transaction(async (transaction) => {
      await validateImpl(me, input.email, input.token, transaction);
    });

    invalidateUserCache(me.id);
  });

export default router({
  validate,
});
