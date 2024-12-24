import z from "zod";
import { zMinUser } from "./User";
import { zOptionalDateColumn } from "./DateColumn";

export const zKudos = z.object({
  receiver: zMinUser,
  giver: zMinUser,
  // Kudos with null text is a like.
  text: z.string().nullable(),
  createdAt: zOptionalDateColumn,
});
export type Kudos = z.TypeOf<typeof zKudos>;
