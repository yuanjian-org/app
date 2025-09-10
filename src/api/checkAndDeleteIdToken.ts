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
    where: { [idType === "phone" ? "phone" : "email"]: id, token },
    attributes: ["id", "updatedAt"],
    transaction,
  });

  const idText = idType === "phone" ? "手机" : "邮箱";
  if (!dbToken) {
    throw generalBadRequestError(`${idText}验证码错误。`);
  } else if (moment().diff(dbToken.updatedAt, "minutes") > tokenMaxAgeInMins) {
    throw generalBadRequestError(`${idText}验证码已过期，请重新验证。`);
  }
  await dbToken.destroy({ transaction });
}
