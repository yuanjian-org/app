import { z } from "zod";
import { zRoles } from "./Role";
import { zMenteeStatus } from "./MenteeStatus";

export const zMinUser = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
});
export type MinUser = z.TypeOf<typeof zMinUser>;

export const zUser = zMinUser.merge(z.object({
  // TODO: Consider moving role to MinUser to avoid retrieving the whole User
  // object just for permission checking.
  roles: zRoles,
  email: z.string().email(),
  wechat: z.string().nullable(),
  city: z.string().nullable(),
  sex: z.string().nullable(),
  // For some reason coerce is needed to avoid zod input validation error.
  consentFormAcceptedAt: z.coerce.string().nullable(),
  menteeInterviewerTestLastPassedAt: z.coerce.string().nullable(),
  menteeStatus: zMenteeStatus.nullable(),
  pointOfContact: zMinUser.nullable(),
  pointOfContactNote: z.string().nullable(),
}));
type User = z.TypeOf<typeof zUser>;

export default User;

export const zUserFilter = z.object({
  hasMenteeApplication: z.boolean().optional(),
  hasMentorApplication: z.boolean().optional(),
  matchesNameOrEmail: z.string().optional(),
  containsRoles: zRoles.optional(),
  menteeStatus: zMenteeStatus.nullable().optional(),
});
export type UserFilter = z.TypeOf<typeof zUserFilter>;

export const zMentorPreference = z.object({
  '最多匹配学生': z.number().optional(),
  '不参加就业辅导': z.boolean().optional(),
});
export type MentorPreference = z.TypeOf<typeof zMentorPreference>;

export const defaultMentorCapacity = 2;

export const zInterviewerPreference = z.object({
  optIn: z.boolean().optional(),
  limit: z.object({
    noMoreThan: z.number(),
    until: z.coerce.string(),
  }).optional(),
});
export type InterviewerPreference = z.TypeOf<typeof zInterviewerPreference>;

export const zUserPreference = z.object({
  interviewer: zInterviewerPreference.optional(),
  mentor: zMentorPreference.optional(),
});
export type UserPreference = z.TypeOf<typeof zUserPreference>;
