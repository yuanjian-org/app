import User from "./User";
import { isPermitted } from "./Role";
import { MenteeStatus } from "./MenteeStatus";

export const allowedShudongMenteeStatuses: MenteeStatus[] = [
  "现届学子",
  "仅奖学金",
  "活跃校友",
];

export function canAccessShudong(
  user: Pick<User, "id" | "roles" | "menteeStatus">,
): boolean {
  if (isPermitted(user.roles, "ShudongAdmin")) {
    return true;
  }
  if (isPermitted(user.roles, "Mentor")) {
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

export function canEditOrDeleteShudongPost(
  user: Pick<User, "id" | "roles">,
  postAuthorId: string | null,
): boolean {
  if (isPermitted(user.roles, "ShudongAdmin")) {
    return true;
  }
  return postAuthorId !== null && user.id === postAuthorId;
}
