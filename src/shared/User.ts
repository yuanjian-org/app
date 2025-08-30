import { z } from "zod";
import Role, { isPermitted, zRoles } from "./Role";
import { MenteeStatus, zMenteeStatus } from "./MenteeStatus";
import { zDateColumn } from "./DateColumn";
import { zTraitsPreference } from "./Traits";
import { isValidChineseCellNumber } from "./strings";

export const zMinUser = z.object({
  id: z.string(),
  name: z.string().nullable(),

  /**
   * Do not use this field directly. Call getUserUrl() instead.
   */
  url: z.string().nullable(),
});
export type MinUser = z.TypeOf<typeof zMinUser>;

/**
 * Values of the cell phone number field of the User object / model:
 *
 * - null: user hasn't gotten a chance to provide the number
 * - "declined-<uuid>": the user chose not to provide the number
 * - "required-<uuid>": the cell phone number is required but not provided
 * - Once a number is provided, this field can no longer enter the other
 *   three states.
 *
 * The `uuid` is to satisfy the cell column's unique constraint.
 */
export const cellDeclinedPrefix = "declined-";
export const cellRequiredPrefix = "required-";

export const zCell = z
  .string()
  .nullable()
  .refine(
    (cell) => {
      return (
        cell === null ||
        cell.startsWith(cellDeclinedPrefix) ||
        cell.startsWith(cellRequiredPrefix) ||
        isValidChineseCellNumber(cell)
      );
    },
    {
      message: "无效手机号码",
    },
  );
export type Cell = z.TypeOf<typeof zCell>;

export function isCellDeclined(cell: Cell) {
  return cell?.startsWith(cellDeclinedPrefix);
}

export function isCellRequired(cell: Cell) {
  return cell?.startsWith(cellRequiredPrefix);
}

export function isCellSet(cell: Cell) {
  return cell !== null && !isCellDeclined(cell) && !isCellRequired(cell);
}

export const zUser = zMinUser.merge(
  z.object({
    // TODO: Consider moving roles to MinUser to avoid retrieving the whole User
    // object just for permission checking.
    roles: zRoles,
    email: z.string().email(),
    cell: zCell,
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
    mergedToUser: zMinUser.nullish(),
    mergedFrom: z.array(zMinUser).optional(),
    mergeToken: z
      .object({
        expiresAt: zDateColumn,
      })
      .nullish(),
  }),
);
export type UserWithMergeInfo = z.TypeOf<typeof zUserWithMergeInfo>;

export const zUserFilter = z.object({
  matchesNameOrEmail: z.string().optional(),
  containsRoles: zRoles.optional(),
  menteeStatus: zMenteeStatus.nullable().optional(),
  pointOfContactId: z.string().optional(),

  includeBanned: z.boolean().optional(),
  includeNonVolunteers: z.boolean().optional(),
  includeMerged: z.boolean().optional(),

  returnMergeInfo: z.boolean().optional(),
});
export type UserFilter = z.TypeOf<typeof zUserFilter>;

export const zMentorPreference = z.object({
  最多匹配学生: z.number().optional(),
  不参加就业辅导: z.boolean().optional(),
  学生特质: zTraitsPreference.optional(),
});
export type MentorPreference = z.TypeOf<typeof zMentorPreference>;

export const defaultMentorCapacity = 2;

export const zInterviewerPreference = z.object({
  optIn: z.boolean().optional(),
  limit: z
    .object({
      noMoreThan: z.number(),
      until: zDateColumn,
    })
    .optional(),
});
export type InterviewerPreference = z.TypeOf<typeof zInterviewerPreference>;

export const zUserPreference = z.object({
  interviewer: zInterviewerPreference.optional(),
  mentor: zMentorPreference.optional(),
});
export type UserPreference = z.TypeOf<typeof zUserPreference>;

export function isAcceptedMentee(
  roles: Role[],
  menteeStatus: MenteeStatus | null,
  includeTransactionalOnly?: boolean,
) {
  // Force type check
  const transactionalOnly: MenteeStatus[] = ["仅不定期", "仅奖学金"];
  const s: MenteeStatus[] = [
    "现届学子",
    "活跃校友",
    "学友",
    ...(includeTransactionalOnly ? transactionalOnly : []),
  ];
  return (
    isPermitted(roles, "Mentee") && menteeStatus && s.includes(menteeStatus)
  );
}

export function getUserUrl(u: MinUser) {
  return u.url ? `/${u.url}` : `/users/${u.id}`;
}
