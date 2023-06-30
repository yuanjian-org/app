import { z } from "zod";
import { zRoles } from "./Role";

export const zUserProfile = z.object({
  roles: zRoles,
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  // For some reason coerce is needed to avoid zod input validation error.
  consentFormAcceptedAt: z.coerce.date().nullable(),
});

type UserProfile = z.TypeOf<typeof zUserProfile>;

export default UserProfile;
