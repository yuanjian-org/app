import { z } from "zod";
import { zRoles } from "./Role";

export const zMinUserProfile = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
});
export type MinUserProfile = z.TypeOf<typeof zMinUserProfile>;
export const minUserProfileAttributes = ['id', 'name'];

export const zUserProfile = zMinUserProfile.merge(z.object({
  roles: zRoles,
  email: z.string().email(),
  // For some reason coerce is needed to avoid zod input validation error.
  consentFormAcceptedAt: z.coerce.date().nullable(),
}));
type UserProfile = z.TypeOf<typeof zUserProfile>;

export default UserProfile;
