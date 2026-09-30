import db from "./database/db";
import { Transaction } from "sequelize";
import { generalBadRequestError } from "./errors";
import { tokenMaxAgeInMins } from "../shared/token";
import moment from "moment";
import { IdType } from "../shared/IdType";
import crypto from "crypto";

export async function checkAndDeleteIdToken(
  idType: IdType,
  id: string,
  token: string,
  transaction: Transaction,
) {
  const idField = idType === "phone" ? "phone" : "email";
  const dbToken = await db.IdToken.findOne({
    where: { [idField]: id },
    attributes: ["id", "token", "createdAt", "failedAttempts"],
    transaction,
  });

  const idText = idType === "phone" ? "手机" : "邮箱";
  if (!dbToken) {
    throw generalBadRequestError(`${idText}验证码错误。`);
  }

  if (moment().diff(dbToken.createdAt, "minutes") > tokenMaxAgeInMins) {
    await dbToken.destroy({ transaction });
    throw generalBadRequestError(`${idText}验证码已过期，请重新验证。`);
  }

  // Use timing-safe comparison to prevent side-channel timing attacks
  const inputBuf = Buffer.from(token);
  const dbTokenBuf = Buffer.from(dbToken.token);
  const isTokenValid =
    inputBuf.length === dbTokenBuf.length &&
    crypto.timingSafeEqual(inputBuf, dbTokenBuf);

  if (!isTokenValid) {
    // Brute-force protection: increment failed attempts and delete after a
    // threshold.
    const failedAttempts = dbToken.failedAttempts + 1;
    if (failedAttempts >= 5) {
      await dbToken.destroy({ transaction });
      throw generalBadRequestError(
        `${idText}验证码错误次数过多。请重新获取验证码。`,
      );
    } else {
      await dbToken.update({ failedAttempts }, { transaction });
      throw generalBadRequestError(`${idText}验证码错误。`);
    }
  }

  await dbToken.destroy({ transaction });
}
