import db from "./database/db";
import { Transaction } from "sequelize";
import { generalBadRequestError } from "./errors";
import { tokenMaxAgeInMins } from "../shared/token";
import moment from "moment";
import { IdType } from "../shared/IdType";
import crypto from "crypto";

// Track whether a Sequelize Transaction was started as a managed transaction
// (`sequelize.transaction(async (t) => ...)` passes `useCLS = true` to
// `prepareEnvironment`, whereas unmanaged `sequelize.transaction()` passes
// `useCLS = false`). When `checkAndDeleteIdToken` rejects inside a managed
// transaction, Sequelize automatically rolls back the transaction unless it has
// already been committed, which would otherwise undo `failedAttempts` updates
// and expired-token deletions.
const origPrepareEnvironment = (Transaction.prototype as any)
  .prepareEnvironment;
if (
  typeof origPrepareEnvironment === "function" &&
  !(origPrepareEnvironment as any)._hookedManagedFlag
) {
  const wrapped = function (this: any, useCLS = true) {
    this._isManaged = Boolean(useCLS);
    return origPrepareEnvironment.call(this, useCLS);
  };
  (wrapped as any)._hookedManagedFlag = true;
  (Transaction.prototype as any).prepareEnvironment = wrapped;
}

async function commitIfManaged(transaction: Transaction) {
  if (
    transaction &&
    (transaction as any)._isManaged &&
    !(transaction as any).parent &&
    !(transaction as any).finished
  ) {
    await transaction.commit();
  }
}

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
    lock: transaction ? transaction.LOCK.UPDATE : undefined,
  });

  const idText = idType === "phone" ? "手机" : "邮箱";
  if (!dbToken) {
    throw generalBadRequestError(`${idText}验证码错误。`);
  }

  if (moment().diff(dbToken.createdAt, "minutes") > tokenMaxAgeInMins) {
    await dbToken.destroy({ transaction });
    await commitIfManaged(transaction);
    throw generalBadRequestError(`${idText}验证码已过期，请重新验证。`);
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
    // Brute-force protection: increment failed attempts and delete after a
    // threshold. Commit managed transactions before throwing so Sequelize's
    // automatic error rollback does not undo the counter update or deletion.
    const failedAttempts = dbToken.failedAttempts + 1;
    if (failedAttempts >= 5) {
      await dbToken.destroy({ transaction });
      await commitIfManaged(transaction);
      throw generalBadRequestError(
        `${idText}验证码错误次数过多。请重新获取验证码。`,
      );
    } else {
      await dbToken.update({ failedAttempts }, { transaction });
      await commitIfManaged(transaction);
      throw generalBadRequestError(`${idText}验证码错误。`);
    }
  }

  await dbToken.destroy({ transaction });
}
