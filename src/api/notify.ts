import { Op, Transaction } from "sequelize";
import { NotificationType } from "shared/UserPreference";
import db from "./database/db";
import { sms } from "./sms";
import { email } from "./email";
import getBaseUrl from "shared/getBaseUrl";
import Role from "shared/Role";
import sequelize from "./database/sequelize";
import { isProd } from "shared/isProd";

type TemplateSet = {
  // AokSend email template id.
  email: string;
  // Submail SMS template ids.
  domesticSms: string;
  internationalSms: string;
};

export function notifyRolesIgnoreError(
  roles: Role[],
  subject: string,
  content: string,
) {
  const logError = (e: any) => {
    console.log(`notifyRolesIgnoreError() ignored error:`, roles, subject, e);
  };
  try {
    // Do not use the transaction from the caller so the caller can proceed
    // without waiting for us.
    void sequelize.transaction(async (transaction) => {
      try {
        await notifyRoles(roles, subject, content, transaction);
      } catch (e) {
        logError(e);
      }
    });
  } catch (e) {
    logError(e);
  }
}

export async function notifyRoles(
  roles: Role[],
  subject: string,
  content: string,
  transaction: Transaction,
) {
  const userIds: Set<string> = new Set();
  for (const role of roles) {
    const users = await db.User.findAll({
      where: { roles: { [Op.contains]: [role] } },
      attributes: ["id"],
      transaction,
    });
    users.forEach((u) => userIds.add(u.id));
  }
  await notify(
    "基础",
    Array.from(userIds),
    {
      email: "E_114706970517",
      domesticSms: "JCGmM2",
      internationalSms: "2VFsY",
    },
    {
      subject,
      content,
    },
    transaction,
  );
}

/**
 * `templateVariables` should include variables needed for all three templates.
 */
export async function notify(
  type: NotificationType,
  userIds: string[],
  templateSet: TemplateSet,
  templateVariables: Record<string, string>,
  transaction: Transaction,
) {
  const users = await db.User.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ["email", "phone", "preference"],
    transaction,
  });

  const smsUsers = users.filter(
    (u) =>
      u.phone &&
      !u.preference?.smsDisabled?.includes("基础") &&
      !u.preference?.smsDisabled?.includes(type),
  );
  // Do not send SMS in production yet
  const smsPromise = isProd()
    ? Promise.resolve()
    : sms(
        templateSet.domesticSms,
        templateSet.internationalSms,
        smsUsers.map((u) => ({
          to: u.phone!,
          vars: templateVariables,
        })),
      );

  const emailUsers = users.filter(
    (u) =>
      u.email &&
      !u.preference?.emailDisabled?.includes("基础") &&
      !u.preference?.emailDisabled?.includes(type),
  );
  const emailPromise = email(
    emailUsers.map((u) => u.email!),
    templateSet.email,
    templateVariables,
    getBaseUrl(),
  );

  // Parallelize to speed up the function
  await Promise.all([smsPromise, emailPromise]);
}
