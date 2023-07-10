import { z } from "zod";

export const zAssessment = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  summary: z.string().nullable(),
});
type Assessment = z.TypeOf<typeof zAssessment>;

export default Assessment;
