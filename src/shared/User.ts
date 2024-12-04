import { z } from "zod";
import Role, { isPermitted, zRoles } from "./Role";
import { MenteeStatus, zMenteeStatus } from "./MenteeStatus";
import { zNullableDateColumn, zDateColumn } from "./DateColumn";

export const zMinUser = z.object({
  id: z.string(),
  name: z.string().nullable(),
  url: z.string().nullable(),
});
export type MinUser = z.TypeOf<typeof zMinUser>;

export const zUser = zMinUser.merge(z.object({
  // TODO: Consider moving roles to MinUser to avoid retrieving the whole User
  // object just for permission checking.
  roles: zRoles,
  email: z.string().email(),
  wechat: z.string().nullable(),
  consentFormAcceptedAt: zNullableDateColumn,
  menteeInterviewerTestLastPassedAt: zNullableDateColumn,
  menteeStatus: zMenteeStatus.nullable(),
  pointOfContact: zMinUser.nullable(),
  pointOfContactNote: z.string().nullable(),
}));
type User = z.TypeOf<typeof zUser>;

export default User;

// These merge info fields should be populated only when
// UserFilter.includeMerged is true.
export const zUserWithMergeInfo = zUser.merge(z.object({
  mergedTo: z.string().nullish(),
  mergedFrom: z.array(zMinUser).optional(),
  mergeToken: z.object({
    expiresAt: zDateColumn,
  }).nullish(),
}));
export type UserWithMergeInfo = z.TypeOf<typeof zUserWithMergeInfo>;

export const zUserFilter = z.object({
  matchesNameOrEmail: z.string().optional(),
  containsRoles: zRoles.optional(),
  menteeStatus: zMenteeStatus.nullable().optional(),
  pointOfContactId: z.string().optional(),

  includeBanned: z.boolean().optional(),
  includeNonVolunteers: z.boolean().optional(),
  includeMerged: z.boolean().optional(),
});
export type UserFilter = z.TypeOf<typeof zUserFilter>;

export const zMentorPreference = z.object({
  '学生偏好': z.string().optional(),
  '最多匹配学生': z.number().optional(),
  '不参加就业辅导': z.boolean().optional(),
});
export type MentorPreference = z.TypeOf<typeof zMentorPreference>;

export const defaultMentorCapacity = 2;

export const zInterviewerPreference = z.object({
  optIn: z.boolean().optional(),
  limit: z.object({
    noMoreThan: z.number(),
    until: zDateColumn,
  }).optional(),
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
  includeAdhocMentorshipOnlyAcceptance?: boolean
) {
  const s: MenteeStatus[] = ["现届学子", "活跃校友", "学友",
    ...includeAdhocMentorshipOnlyAcceptance ? ["仅不定期" as MenteeStatus] : [],
  ];
  return isPermitted(roles, 'Mentee')
    && menteeStatus && s.includes(menteeStatus);
}

export function getUserUrl(u: MinUser) {
  return u.url ? `/${u.url}` : `/users/${u.id}`;
}
