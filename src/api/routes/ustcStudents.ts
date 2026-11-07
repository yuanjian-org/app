import { procedure, router } from "../trpc";
import { z } from "zod";
import { addRole, displayName } from "../../shared/Role";
import db from "../database/db";
import sequelize from "../database/sequelize";
import { authUser } from "../auth";
import { invalidateUserCache } from "../../pages/api/auth/[...nextauth]";
import { MenteeStatus } from "../../shared/MenteeStatus";
import invariant from "shared/invariant";
import User from "../../shared/User";
import { Op, Transaction } from "sequelize";
import { setEmailImpl } from "./idTokens";
import { generalBadRequestError, noPermissionError } from "api/errors";
import { WhiteLabel, whiteLabel } from "../../shared/WhiteLabel";

export async function validateImpl(
  me: User,
  email: string,
  token: string,
  transaction: Transaction,
  currentWhiteLabel: WhiteLabel,
) {
  // Only allow USTC student self-validation on the ustc tenant.
  if (currentWhiteLabel !== "ustc") {
    throw noPermissionError("学生认证", email);
  }

  if (!email.endsWith("@mail.ustc.edu.cn")) {
    throw generalBadRequestError("邮箱必须是中科大邮箱。");
  }

  // Prevent transferring an already-verified USTC email across accounts to
  // mint multiple Mentee accounts.
  const existing = await db.User.findOne({
    attributes: ["id"],
    where: { email, id: { [Op.ne]: me.id } },
    transaction,
  });
  if (existing) {
    throw generalBadRequestError(
      `此邮箱已被其他账号验证。请联系${displayName("UserAdmin")}。`,
    );
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
      await validateImpl(me, input.email, input.token, transaction, whiteLabel);
    });

    invalidateUserCache(me.id);
  });

export default router({
  validate,
});
