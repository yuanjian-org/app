import { z } from "zod";
import { zMinUser } from "./User";
import { zGroup } from "./Group";
import { zNullableDateColumn } from "./DateColumn";
import { compareDate, toChineseDayOfWeek } from "./strings";
import moment from "moment";

/**
 * Each relational mentorship is expected to have a fixed monthly schedule.
 */
export const zMentorshipSchedule = z.object({
  // Week of month
  week: z.number().min(1).max(4),
  // Day of week
  day: z.number().min(1).max(7),
  // Hour of day
  hour: z.number().min(0).max(23),
  // Minute of hour
  minute: z.number().min(0).max(59),
});
export type MentorshipSchedule = z.TypeOf<typeof zMentorshipSchedule>;

export const zMentorship = z.object({
  id: z.string(),

  /**
   * Whether this mentorship is transactional or relational. See
   * docs/Glossary.md for their definitions.
   */
  transactional: z.boolean(),

  /**
   * If null, the mentorship is active without an end date.
   * It should be non-null for transactional mentorship.
   * It should be null for ongoing relational mentorship.
   * It should be non-null for ended relational mentorship.
   * See also MentorshipEditor() in mentees.tsx
   */
  endsAt: zNullableDateColumn,

  mentor: zMinUser,
  mentee: zMinUser,
  group: zGroup,
  schedule: zMentorshipSchedule.nullable(),
});
export type Mentorship = z.TypeOf<typeof zMentorship>;

export function isValidMentorshipIds(
  menteeId: string | null,
  mentorId: string | null,
) {
  return z.string().uuid().safeParse(menteeId).success
    && z.string().uuid().safeParse(mentorId).success
    && menteeId !== mentorId;
}

export function isEndedTransactionalMentorship(m: Mentorship) {
  return m.transactional && m.endsAt && compareDate(m.endsAt, new Date()) < 0;
}

export function newTransactionalMentorshipEndsAt(): Date {
  return moment().add(2, 'weeks').toDate();
}

export function formatMentorshipSchedule(s: MentorshipSchedule) {
  return `第 ${s.week} 个周${toChineseDayOfWeek(s.day)} `
    + `${s.hour.toString().padStart(2, '0')}` 
    + `:${s.minute.toString().padStart(2, '0')}`;
}
