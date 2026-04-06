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
  const idField = idType === "phone" ? "phone" : "email";
  const dbToken = await db.IdToken.findOne({
    where: { [idField]: id },
    attributes: ["id", "token", "updatedAt", "failedAttempts"],
    transaction,
  });

  const idText = idType === "phone" ? "手机" : "邮箱";
  if (!dbToken) {
    throw generalBadRequestError(`${idText}验证码错误。`);
  }

  if (dbToken.token !== token) {
    await dbToken.increment("failedAttempts", { transaction });
    await dbToken.reload({ transaction });
    if (dbToken.failedAttempts >= 5) {
      await dbToken.destroy({ transaction });
    }
    throw generalBadRequestError(`${idText}验证码错误。`);
  }

  if (moment().diff(dbToken.updatedAt, "minutes") > tokenMaxAgeInMins) {
    await dbToken.destroy({ transaction });
    throw generalBadRequestError(`${idText}验证码已过期，请重新验证。`);
  }
  await dbToken.destroy({ transaction });
}
