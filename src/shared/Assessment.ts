import { z } from "zod";
import { zOptionalDateColumn } from "./DateColumn";

export const zAssessment = z.object({
  id: z.string().uuid(),
  createdAt: zOptionalDateColumn,
  summary: z.string().nullable(),
});
type Assessment = z.TypeOf<typeof zAssessment>;

export default Assessment;
