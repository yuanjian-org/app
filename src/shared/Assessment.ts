import { z } from "zod";

export const zAssessment = z.object({
  id: z.string().uuid(),
  createdAt: z.coerce.string().optional(), // For some reason optional() is needed to avoid ts type check errors.
  summary: z.string().nullable(),
});
type Assessment = z.TypeOf<typeof zAssessment>;

export default Assessment;
