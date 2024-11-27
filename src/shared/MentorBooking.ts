import { z } from "zod";
import { zMinUser } from "./User";
import { zOptionalDateColumn } from "./DateColumn";

export const zMentorBooking = z.object({
  id: z.string(),
  requester: zMinUser,
  requestedMentor: zMinUser.nullable(),
  assignedMentor: zMinUser.nullable(),
  topic: z.string(),
  notes: z.string().nullable(),
  updater: zMinUser.nullable(),
  createdAt: zOptionalDateColumn,
});
export type MentorBooking = z.TypeOf<typeof zMentorBooking>;
