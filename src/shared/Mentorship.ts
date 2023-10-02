import { z } from "zod";
import { zMinUser } from "./User";
import { zAssessment } from "./Assessment";
import { zGroupCountingTranscripts } from "./Group";

export const zPrivateMentorNotes = z.object({
  memo: z.string().optional(),
});
export type PrivateMentorNotes = z.TypeOf<typeof zPrivateMentorNotes>;

export const zMentorship = z.object({
  id: z.string().uuid(),
  mentor: zMinUser,
  mentee: zMinUser,
});
export type Mentorship = z.TypeOf<typeof zMentorship>;

export const zMentorshipWithGroupAndNotes = zMentorship.merge(z.object({
  group: zGroupCountingTranscripts,
  privateMentorNotes: zPrivateMentorNotes.nullable(),
}));
export type MentorshipWithGroupAndNotes = z.TypeOf<typeof zMentorshipWithGroupAndNotes>;

export const zMentorshipWithAssessmentsDeprecated = zMentorship.merge(z.object({
  assessments: z.array(zAssessment)
}));
export type MentorshipWithAssessmentsDeprecated = z.TypeOf<typeof zMentorshipWithAssessmentsDeprecated>;

export function isValidMentorshipIds(menteeId: string | null, mentorId: string | null) {
  return z.string().uuid().safeParse(menteeId).success
    && z.string().uuid().safeParse(mentorId).success
    && menteeId !== mentorId;
}
