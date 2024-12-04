import { z } from "zod";

export const zUserState = z.object({
  declinedMergeModal: z.boolean().optional(),
});
export type UserState = z.TypeOf<typeof zUserState>;
