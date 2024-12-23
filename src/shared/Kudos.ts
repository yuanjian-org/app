import z from "zod";
import { zMinUser } from "./User";
import { zDateColumn } from "./DateColumn";

export const zKudos = z.object({
  receiver: zMinUser,
  giver: zMinUser,
  // Kudos with null text is a like.
  text: z.string().nullable(),
  // `optional()` is to suppress typescript error, but this field is guaranteed
  // to be present.
  createdAt: zDateColumn.optional(),
});
export type Kudos = z.TypeOf<typeof zKudos>;
