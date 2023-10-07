import { z } from "zod";
import { zMinUser } from "./User";
import { zGroup } from "./Group";

export const zMentorship = z.object({
  id: z.string().uuid(),
  mentor: zMinUser,
  mentee: zMinUser,
});
export type Mentorship = z.TypeOf<typeof zMentorship>;

export const zMentorshipWithGroup = zMentorship.merge(z.object({
  group: zGroup,
}));
export type MentorshipWithGroup = z.TypeOf<typeof zMentorshipWithGroup>;

export function isValidMentorshipIds(menteeId: string | null, mentorId: string | null) {
  return z.string().uuid().safeParse(menteeId).success
    && z.string().uuid().safeParse(mentorId).success
    && menteeId !== mentorId;
}
