import { z } from "zod";
import { zMinUser } from "./User";
import { zGroup } from "./Group";
import { zNullableDateColumn } from "./DateColumn";
import { compareDate } from "./strings";

export const zMentorship = z.object({
  id: z.string(),
  transactional: z.boolean(),
  endsAt: zNullableDateColumn,
  mentor: zMinUser,
  mentee: zMinUser,
  group: zGroup,
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
  return m.transactional && m.endsAt && compareDate(m.endsAt, new Date()) > 0;
}
