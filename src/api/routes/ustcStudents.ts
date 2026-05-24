import { procedure, router } from "../trpc";
import { z } from "zod";
import { addRole } from "../../shared/Role";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { authUser } from "../auth";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import { checkAndDeleteIdToken } from "../../api/checkAndDeleteIdToken";
import { MenteeStatus } from "../../shared/MenteeStatus";
import invariant from "shared/invariant";
import User from "../../shared/User";
import { Transaction } from "sequelize";

export async function validateImpl(
  me: User,
  email: string,
  token: string,
  transaction: Transaction,
) {
  // 1. Verify and consume the email verification token
  await checkAndDeleteIdToken("email", email, token, transaction);

  // 2. Fetch current user
  const user = await db.User.findByPk(me.id, {
    attributes: ["id", "roles", "menteeStatus"],
    transaction,
  });
  invariant(user, `User not found: ${me.id}`);

  // 3. Update the user
  // Note: We're making them a Mentee and setting their status if it's null,
  // similarly to pearl students.
  const menteeStatus: MenteeStatus =
    user.menteeStatus === null ? "现届学子" : user.menteeStatus;

  await user.update(
    {
      email,
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
