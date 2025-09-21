import { z } from "zod";
import Role, { isPermitted, zRoles } from "./Role";
import { MenteeStatus, zMenteeStatus } from "./MenteeStatus";

export const zMinUser = z.object({
  id: z.string(),
  name: z.string().nullable(),

  /**
   * Do not use this field directly. Call getUserUrl() instead.
   */
  url: z.string().nullable(),
});
export type MinUser = z.TypeOf<typeof zMinUser>;

export const zUser = zMinUser.merge(
  z.object({
    // TODO: Consider moving roles to MinUser to avoid retrieving the whole User
    // object just for permission checking.
    roles: zRoles,
    email: z.string().nullable(),
    phone: z.string().nullable(),
    wechat: z.string().nullable(),
    menteeStatus: zMenteeStatus.nullable(),
    pointOfContact: zMinUser.nullable(),
    pointOfContactNote: z.string().nullable(),
  }),
);
type User = z.TypeOf<typeof zUser>;

export default User;

// These merge info fields should be populated only when
// UserFilter.includeMerged is true.
export const zUserWithMergeInfo = zUser.merge(
  z.object({
    wechatUnionId: z.string().nullish(),
    mergedToUser: zMinUser.nullish(),
  }),
);
export type UserWithMergeInfo = z.TypeOf<typeof zUserWithMergeInfo>;

export function isAcceptedMentee(
  roles: Role[],
  menteeStatus: MenteeStatus | null,
  scope: "includeTransactionalOnly" | "excludeTransactionalOnly",
) {
  if (!menteeStatus || !isPermitted(roles, "Mentee")) return false;
  let s: MenteeStatus[] = ["现届学子", "活跃校友", "学友"];
  if (scope === "includeTransactionalOnly") {
    s = [...s, "仅不定期", "未审珍珠生"];
  }
  return s.includes(menteeStatus);
}

export function getUserUrl(u: MinUser) {
  return u.url ? `/${u.url}` : `/users/${u.id}`;
}
