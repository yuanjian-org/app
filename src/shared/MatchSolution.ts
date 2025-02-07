import { z } from "zod";
import { zMinUser } from "./User";

export const zMatchSolution = z.array(z.object({
  mentee: zMinUser,
  // Mentors in the solution that the mentee preferred
  preferredMentors: z.array(zMinUser),
  // Mentors not in the solution that the mentee preferred
  nonPreferredMentors: z.array(zMinUser),
  // Mentors not in the solution that the mentee preferred
  excludedPreferredMentors: z.array(zMinUser),
}));
export type MatchSolution = z.TypeOf<typeof zMatchSolution>;
