import { z } from "zod";
import { zMinUser } from "./User";
import { zGroup } from "./Group";

export const zMentorship = z.object({
  id: z.string(),
  endedAt: z.coerce.string().nullable(),
  mentor: zMinUser,
  mentee: zMinUser,
  group: zGroup,
});
export type Mentorship = z.TypeOf<typeof zMentorship>;

export function isValidMentorshipIds(menteeId: string | null, mentorId: string | null) {
  return z.string().uuid().safeParse(menteeId).success
    && z.string().uuid().safeParse(mentorId).success
    && menteeId !== mentorId;
}
