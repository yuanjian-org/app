import { z } from "zod";
import { zMinUser } from "./User";
import { zAssessment } from "./Assessment";
import { zGroupCountingTranscripts } from "./Group";

export const zPrivateMentorNotes = z.object({
  memo: z.string().optional(),
});
export type PrivateMentorNotes = z.TypeOf<typeof zPrivateMentorNotes>;

export const zPartnership = z.object({
  id: z.string().uuid(),
  mentor: zMinUser,
  mentee: zMinUser,
});
export type Partnership = z.TypeOf<typeof zPartnership>;

export const zPartnershipWithGroupAndNotes = zPartnership.merge(z.object({
  group: zGroupCountingTranscripts,
  privateMentorNotes: zPrivateMentorNotes.nullable(),
}));
export type PartnershipWithGroupAndNotes = z.TypeOf<typeof zPartnershipWithGroupAndNotes>;

export const zPartnershipWithAssessmentsDeprecated = zPartnership.merge(z.object({
  assessments: z.array(zAssessment)
}));
export type PartnershipWithAssessmentsDeprecated = z.TypeOf<typeof zPartnershipWithAssessmentsDeprecated>;

export function isValidPartnershipIds(menteeId: string | null, mentorId: string | null) {
  return z.string().uuid().safeParse(menteeId).success
    && z.string().uuid().safeParse(mentorId).success
    && menteeId !== mentorId;
}
