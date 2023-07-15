import { z } from "zod";
import { zMinUserProfile } from "./UserProfile";
import { zAssessment } from "./Assessment";
import { minUserProfileAttributes } from "./UserProfile";

export const zPrivateMentorNotes = z.object({
  memo: z.string().optional(),
});
export type PrivateMentorNotes = z.TypeOf<typeof zPrivateMentorNotes>;

export const zPartnership = z.object({
  id: z.string().uuid(),
  mentor: zMinUserProfile,
  mentee: zMinUserProfile,
});
export type Partnership = z.TypeOf<typeof zPartnership>;

export const zPartnershipWithPrivateMentorNotes = zPartnership.merge(z.object({
  privateMentorNotes: zPrivateMentorNotes.nullable(),
}));
export type PartnershipWithPrivateMentorNotes = z.TypeOf<typeof zPartnershipWithPrivateMentorNotes>;

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

export const minAttributes = ['id', 'menteeId', 'mentorId'];

export const includePartnershipUsers = [{
  association: 'mentor',
  attributes: minUserProfileAttributes,
}, {
  association: 'mentee',
  attributes: minUserProfileAttributes,
}];
