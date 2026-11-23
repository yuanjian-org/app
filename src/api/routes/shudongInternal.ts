/**
 * Shudong helpers shared by shudong.ts and scheduledNotifications.ts. Kept in
 * a separate file to avoid circular imports between the two modules.
 */

import { Op, WhereOptions } from "sequelize";
import Role, { isPermitted } from "../../shared/Role";
import { MenteeStatus } from "../../shared/MenteeStatus";
import {
  allowedShudongMenteeStatuses,
  canAccessShudong,
} from "../../shared/ShudongPermissions";
import { UserPreference } from "../../shared/UserPreference";

// Force type checks on the role names.
const mentorRole: Role = "Mentor";
const shudongAdminRole: Role = "ShudongAdmin";
const menteeRole: Role = "Mentee";

/**
 * Where clause on the User model matching `canAccessShudong()` (excluding
 * merged accounts): ShudongAdmin, Mentor, or Mentee with an allowed
 * `menteeStatus`.
 */
export const shudongAccessibleUserWhere: WhereOptions = {
  mergedTo: null,
  [Op.or]: [
    { roles: { [Op.contains]: [shudongAdminRole] } },
    { roles: { [Op.contains]: [mentorRole] } },
    {
      roles: { [Op.contains]: [menteeRole] },
      menteeStatus: { [Op.in]: allowedShudongMenteeStatuses },
    },
  ],
};

/**
 * Returns whether a user receives global notifications for new Shudong
 * questions based on their Shudong access permissions, `shudongSubscribeAll`
 * preference, and roles.
 */
export function isShudongGlobalSubscriber(user: {
  id: string;
  roles: Role[];
  menteeStatus: MenteeStatus | null;
  mergedTo?: string | null;
  preference?: UserPreference | null;
}): boolean {
  if (user.mergedTo || !canAccessShudong(user)) {
    return false;
  }
  const choice = user.preference?.shudongSubscribeAll ?? "default";
  return (
    choice === "yes" ||
    choice === "yesWithResponses" ||
    (choice === "default" && isPermitted(user.roles, "Mentor"))
  );
}

/**
 * Where clause on the User model that selects users who are globally
 * notified of new Shudong questions. A user receives new question
 * notifications if they satisfy `canAccessShudong()` and:
 *
 * - their `shudongSubscribeAll` preference is "yes" or "yesWithResponses", or
 * - they are a mentor and the preference is "default" or unset.
 */
export const shudongGlobalSubscriberWhere: WhereOptions = {
  [Op.and]: [
    shudongAccessibleUserWhere,
    {
      [Op.or]: [
        { "preference.shudongSubscribeAll": "yes" },
        { "preference.shudongSubscribeAll": "yesWithResponses" },
        {
          roles: { [Op.contains]: [mentorRole] },
          [Op.or]: [
            { "preference.shudongSubscribeAll": "default" },
            { "preference.shudongSubscribeAll": null },
          ],
        },
      ],
    },
  ],
};

/**
 * Where clause on the User model that selects authorized Shudong users who
 * opted in to automatically subscribe to responses on all new questions.
 */
export const shudongAutoSubscribeResponsesWhere: WhereOptions = {
  [Op.and]: [
    shudongAccessibleUserWhere,
    { "preference.shudongSubscribeAll": "yesWithResponses" },
  ],
};

/**
 * Where clause on the User model that selects authorized Shudong users who
 * opted into receiving a single daily digest of Shudong notifications instead
 * of immediate alerts.
 */
export const shudongDailyDigestUserWhere: WhereOptions = {
  [Op.and]: [
    shudongAccessibleUserWhere,
    { "preference.shudongNotificationFrequency": "daily" },
  ],
};

/**
 * Fixed subject ID for "ShudongQuestion" scheduled notifications. New
 * questions are not tied to a specific subject, so all of them share this
 * nil UUID. The unique (type, subjectId) index on ScheduledNotification then
 * batches new questions posted within the delay window into one notification.
 */
export const shudongNewQuestionSubjectId =
  "00000000-0000-0000-0000-000000000000";

/**
 * Fixed subject ID for "ShudongDailyDigest" scheduled notifications. Shares
 * the nil UUID (scoped by `type = "ShudongDailyDigest"`) so all Shudong posts
 * created before the next 20:00 Beijing Time run share one scheduled row.
 */
export const shudongDailyDigestSubjectId =
  "00000000-0000-0000-0000-000000000000";
