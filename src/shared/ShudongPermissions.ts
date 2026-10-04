import User from "./User";
import { isPermitted } from "./Role";
import { MenteeStatus } from "./MenteeStatus";

/**
 * Mentee statuses permitted to use Shudong. Mentees in screening or inactive
 * alumni statuses are excluded to maintain community trust.
 */
export const allowedShudongMenteeStatuses: MenteeStatus[] = [
  "现届学子",
  "仅奖学金",
  "活跃校友",
];

/**
 * Checks whether a user can read and write posts in Shudong.
 * ShudongAdmin, Mentors, and Mentees in allowed statuses have full access.
 *
 * TODO: shudongGlobalSubscriberWhere should respect access permissions
 * controlled by menteeStatus and Mentee role.
 */
export function canAccessShudong(
  user: Pick<User, "id" | "roles" | "menteeStatus">,
): boolean {
  if (isPermitted(user.roles, ["ShudongAdmin", "Mentor"])) {
    return true;
  }
  if (
    isPermitted(user.roles, "Mentee") &&
    user.menteeStatus &&
    allowedShudongMenteeStatuses.includes(user.menteeStatus)
  ) {
    return true;
  }
  return false;
}

/**
 * Determines whether a user can edit or delete a Shudong post.
 * ShudongAdmin can edit/delete any post; regular users can only edit/delete
 * their own posts.
 */
export function canEditOrDeleteShudongPost(
  user: Pick<User, "id" | "roles">,
  postAuthorId: string | null,
): boolean {
  if (isPermitted(user.roles, "ShudongAdmin")) {
    return true;
  }
  // Non-admins can only modify their own posts
  return postAuthorId !== null && user.id === postAuthorId;
}
