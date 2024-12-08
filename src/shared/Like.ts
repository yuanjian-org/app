import z from "zod";
import { zMinUser } from "./User";

export const zLike = z.object({
  liker: zMinUser,
  count: z.number(),
});
export type Like = z.TypeOf<typeof zLike>;
