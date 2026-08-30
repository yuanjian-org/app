import { Op, Transaction } from "sequelize";
import { NotificationType } from "shared/UserPreference";
import db from "./database/db";
import { sms } from "./sms";
import { email } from "./email";
import getBaseUrl from "shared/getBaseUrl";
import Role from "shared/Role";
import sequelize from "./database/sequelize";

type Templates = {
  // AokSend email template id.
  email: string;
  // Submail SMS template ids.
  domesticSms: string;
  internationalSms: string;
};

// Deduplication window: 5 minutes in milliseconds.
const DEDUPE_WINDOW_MS = 5 * 60 * 1000;

// Cache map storing deduplication keys and their last sent timestamps.
const recentNotifications = new Map<string, number>();

/**
 * Clear the deduplication cache. Primarily used in unit tests.
 */
export function clearNotificationDedupeCache() {
  recentNotifications.clear();
}

/**
 * Generates a unique deduplication key for a notification.
 */
function getDedupeKey(
  type: NotificationType,
  userIds: string[],
  templates: Templates,
  templateVariables: Record<string, string>,
): string {
  const sortedUserIds = [...userIds].sort();
  return JSON.stringify({
    type,
    userIds: sortedUserIds,
    templates,
    templateVariables,
  });
}

/**
 * Cleans up expired entries from recentNotifications to prevent memory leaks.
 */
function cleanupRecentNotifications(now: number) {
  if (recentNotifications.size > 100) {
    for (const [key, timestamp] of recentNotifications.entries()) {
      if (now - timestamp >= DEDUPE_WINDOW_MS) {
        recentNotifications.delete(key);
      }
    }
  }
}

export function notifyRolesIgnoreError(
  roles: Role[],
  subject: string,
  content: string,
) {
  const logError = (e: unknown) => {
    console.log(
      `notifyRolesIgnoreError() ignored error: ${roles}, ${subject}, ${e}`,
    );
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
  templates: Templates,
  templateVariables: Record<string, string>,
  transaction: Transaction,
) {
  const now = Date.now();
  cleanupRecentNotifications(now);

  const dedupeKey = getDedupeKey(type, userIds, templates, templateVariables);
  const lastSent = recentNotifications.get(dedupeKey);

  if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) {
    console.log(
      `Suppressing duplicate notification within ${DEDUPE_WINDOW_MS}ms window:` +
        ` ${templateVariables.subject ?? dedupeKey}`,
    );
    return;
  }

  recentNotifications.set(dedupeKey, now);

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
  const smsPromise = sms(
    templates.domesticSms,
    templates.internationalSms,
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
    templates.email,
    templateVariables,
    getBaseUrl(),
  );

  // Parallelize to speed up the function
  await Promise.all([smsPromise, emailPromise]);
}
