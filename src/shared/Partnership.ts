import { z } from "zod";
import { zMinUserProfile } from "./UserProfile";
import { zAssessment } from "./Assessment";

export const zPartnership = z.object({
  id: z.string().uuid(),
  mentor: zMinUserProfile,
  mentee: zMinUserProfile,
});

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
