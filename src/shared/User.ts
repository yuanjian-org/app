import { z } from "zod";
import { zRoles } from "./Role";

export const zMinUser = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
});
export type MinUser = z.TypeOf<typeof zMinUser>;

export const zUser = zMinUser.merge(z.object({
  roles: zRoles,
  email: z.string().email(),
  // For some reason coerce is needed to avoid zod input validation error.
  consentFormAcceptedAt: z.coerce.date().nullable(),
}));
type User = z.TypeOf<typeof zUser>;

export default User;
