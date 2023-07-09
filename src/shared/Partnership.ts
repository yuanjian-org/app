import { z } from "zod";
import { zMinUserProfile } from "./UserProfile";

export const zPartnership = z.object({
  mentor: zMinUserProfile,
  mentee: zMinUserProfile,
});

type Partnership = z.TypeOf<typeof zPartnership>;

export default Partnership;

export function isValidPartnershipIds(menteeId: string | null, mentorId: string | null): boolean {
  return z.string().uuid().safeParse(menteeId).success
    && z.string().uuid().safeParse(mentorId).success
    && menteeId !== mentorId;
}
