/**
 * Shudong helpers shared by shudong.ts and scheduledNotifications.ts. Kept in
 * a separate file to avoid circular imports between the two modules.
 */

import { Op, WhereOptions } from "sequelize";
import Role from "../../shared/Role";

// Force type check on the role name.
const mentorRole: Role = "Mentor";

/**
 * Where clause on the User model that selects users who are globally
 * subscribed to all Shudong questions. A user is globally subscribed if:
 *
 * - their `shudongSubscribeAll` preference is "yes", or
 * - they are a mentor and the preference is "default" or unset.
 *
 * TODO: filter out users who are blocked from accessing shudong in
 * canAccessShudong().
 */
export const shudongGlobalSubscriberWhere: WhereOptions = {
  [Op.or]: [
    { "preference.shudongSubscribeAll": "yes" },
    {
      roles: { [Op.contains]: [mentorRole] },
      [Op.or]: [
        { "preference.shudongSubscribeAll": "default" },
        { "preference.shudongSubscribeAll": null },
      ],
    },
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
