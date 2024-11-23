import { z } from "zod";
import { zMinUser } from "./User";

export const zMentorBooking = z.object({
  id: z.string(),
  requester: zMinUser,
  requestedMentor: zMinUser.nullable(),
  assignedMentor: zMinUser.nullable(),
  topic: z.string(),
  notes: z.string().nullable(),
  updater: zMinUser.nullable(),
  createdAt: z.coerce.string().optional(),
});
export type MentorBooking = z.TypeOf<typeof zMentorBooking>;
