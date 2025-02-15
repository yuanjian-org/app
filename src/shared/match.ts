import { z } from "zod";
import { zMinUser } from "./User";

export const zInitialMatchSolution = z.array(z.object({
  mentee: zMinUser,
  pointOfContact: zMinUser.nullable(),
  // 机构来源
  source: z.string().nullable(),
  // Mentors in the solution that the mentee preferred
  preferredMentors: z.array(zMinUser),
  // Mentors not in the solution that the mentee preferred
  nonPreferredMentors: z.array(zMinUser),
  // Mentors not in the solution that the mentee preferred
  excludedPreferredMentors: z.array(zMinUser),
}));
export type InitialMatchSolution = z.TypeOf<typeof zInitialMatchSolution>;

export const zFinalMatchSolution = z.array(z.object({
  mentor: zMinUser,
  mentees: z.array(zMinUser),
}));
export type FinalMatchSolution = z.TypeOf<typeof zFinalMatchSolution>;

export const zCsvFormats = z.object({
  // The keys of the CSV file are user ids.
  ids: z.string(),
  // The keys of the CSV file are user names.
  names: z.string(),
});
export type CsvFormats = z.infer<typeof zCsvFormats>;
