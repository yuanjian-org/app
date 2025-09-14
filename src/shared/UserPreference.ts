import { z } from "zod";
import { zDateColumn } from "./DateColumn";
import { zTraitsPreference } from "./Traits";

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

/**
 * The order of the types dictates the order of display in the preferences page.
 */
export const allNotificationTypes = [
  // When 基础 is false, all notifications will be disabled.
  "基础",
  // Only for Volunteer roles
  "点赞",
  "待办事项",
  // Only for Mentor roles
  "内部笔记",
  "树洞",
] as const;

export type NotificationType = (typeof allNotificationTypes)[number];
export const zNotificationTypes = z.array(z.enum(allNotificationTypes));

export const zUserPreference = z.object({
  interviewer: zInterviewerPreference.optional(),
  mentor: zMentorPreference.optional(),
  // When absent, all notifications are enabled.
  smsDisabled: zNotificationTypes.optional(),
  emailDisabled: zNotificationTypes.optional(),
});
export type UserPreference = z.TypeOf<typeof zUserPreference>;
