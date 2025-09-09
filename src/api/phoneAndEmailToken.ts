import db from "./database/db";
import { generalBadRequestError } from "./errors";
import { phoneTokenMaxAgeInMins } from "../shared/token";
import moment from "moment";
import { Transaction } from "sequelize";

export async function checkAndDeletePhoneToken(
  phone: string,
  token: string,
  transaction: Transaction,
) {
  const dbToken = await db.PhoneAndEmailToken.findOne({
    where: { phone, token },
    attributes: ["id", "updatedAt"],
    transaction,
  });

  if (!dbToken) {
    throw generalBadRequestError("手机验证码错误。");
  } else if (
    moment().diff(dbToken.updatedAt, "minutes") > phoneTokenMaxAgeInMins
  ) {
    throw generalBadRequestError("手机验证码已过期，请重新验证。");
  }
  await dbToken.destroy({ transaction });
}
