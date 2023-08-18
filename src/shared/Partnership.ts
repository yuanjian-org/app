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

export const zPartnershipCountingAssessments = zPartnership.merge(z.object({
  assessments: z.array(z.object({})),
}));
export type PartnershipCountingAssessments = z.TypeOf<typeof zPartnershipCountingAssessments>;

export const zPartnershipWithAssessments = zPartnership.merge(z.object({
  assessments: z.array(zAssessment)
}));
export type PartnershipWithAssessments = z.TypeOf<typeof zPartnershipWithAssessments>;

export function isValidPartnershipIds(menteeId: string | null, mentorId: string | null): boolean {
  return z.string().uuid().safeParse(menteeId).success
    && z.string().uuid().safeParse(mentorId).success
    && menteeId !== mentorId;
}
