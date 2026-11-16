import db from "./database/db";
import sequelize from "./database/sequelize";
import { generalBadRequestError } from "./errors";
import { tokenMaxAgeInMins } from "../shared/token";
import moment from "moment";
import { IdType } from "../shared/IdType";
import crypto from "crypto";

export async function checkAndDeleteIdToken(
  idType: IdType,
  id: string,
  token: string,
) {
  // Run token verification and state updates in a dedicated transaction that
  // returns the validation error instead of throwing inside the transaction
  // callback. This ensures `failedAttempts` increments and expired token
  // deletions are committed rather than rolled back when validation fails.
  const error = await sequelize.transaction(async (transaction) => {
    const idField = idType === "phone" ? "phone" : "email";
    const dbToken = await db.IdToken.findOne({
      where: { [idField]: id },
      attributes: ["id", "token", "createdAt", "failedAttempts"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const idText = idType === "phone" ? "手机" : "邮箱";
    if (!dbToken) {
      return generalBadRequestError(`${idText}验证码错误。`);
    }

    if (moment().diff(dbToken.createdAt, "minutes") > tokenMaxAgeInMins) {
      await dbToken.destroy({ transaction });
      return generalBadRequestError(`${idText}验证码已过期，请重新验证。`);
    }

    // Reject tokens that have already exhausted their 5 attempts. Keeping the
    // row in the database (rather than deleting it on the 5th failure) ensures
    // `sendImpl`'s rate limit is not reset by brute-force guesses.
    if (dbToken.failedAttempts >= 5) {
      return generalBadRequestError(
        `${idText}验证码错误次数过多。请重新获取验证码。`,
      );
    }

    // Use timing-safe comparison to prevent side-channel timing attacks. Ensure
    // token is a string to prevent Buffer.from from treating numeric inputs as
    // allocation sizes.
    const tokenStr = typeof token === "string" ? token : String(token ?? "");
    const inputBuf = Buffer.from(tokenStr);
    const dbTokenBuf = Buffer.from(dbToken.token);
    const isTokenValid =
      inputBuf.length === dbTokenBuf.length &&
      crypto.timingSafeEqual(inputBuf, dbTokenBuf);

    if (!isTokenValid) {
      // Brute-force protection: increment failed attempts and lock out after 5
      // failures without deleting the row so send rate limiting stays enforced.
      const failedAttempts = dbToken.failedAttempts + 1;
      await dbToken.update({ failedAttempts }, { transaction });
      if (failedAttempts >= 5) {
        return generalBadRequestError(
          `${idText}验证码错误次数过多。请重新获取验证码。`,
        );
      }
      return generalBadRequestError(`${idText}验证码错误。`);
    }

    await dbToken.destroy({ transaction });
    return null;
  });

  if (error) {
    throw error;
  }
}
