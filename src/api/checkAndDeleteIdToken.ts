import db from "./database/db";
import { Transaction } from "sequelize";
import { generalBadRequestError } from "./errors";
import { tokenMaxAgeInMins } from "../shared/token";
import moment from "moment";
import { IdType } from "../shared/IdType";

export async function checkAndDeleteIdToken(
  idType: IdType,
  id: string,
  token: string,
  transaction: Transaction,
) {
  const dbToken = await db.IdToken.findOne({
    where: { [idType === "phone" ? "phone" : "email"]: id },
    attributes: ["id", "createdAt", "token", "failedAttempts"],
    transaction,
  });

  const idText = idType === "phone" ? "手机" : "邮箱";
  if (!dbToken) {
    throw generalBadRequestError(`${idText}验证码错误。`);
  } else if (moment().diff(dbToken.createdAt, "minutes") > tokenMaxAgeInMins) {
    // Expiration is checked before token value and failedAttempts for
    // consistency and security: expired tokens are invalid regardless of
    // their correctness.
    //
    // Use createdAt instead of updatedAt because failedAttempts updates
    // would otherwise reset the expiration timer.
    await dbToken.destroy({ transaction });
    throw generalBadRequestError(`${idText}验证码已过期，请重新验证。`);
  }

  if (dbToken.token !== token) {
    // Brute-force protection: increment failedAttempts and delete token after
    // 5 failed attempts.
    const failedAttempts = dbToken.failedAttempts + 1;
    if (failedAttempts >= 5) {
      await dbToken.destroy({ transaction });
    } else {
      await dbToken.update({ failedAttempts }, { transaction });
    }
    throw generalBadRequestError(`${idText}验证码错误。`);
  }

  await dbToken.destroy({ transaction });
}
