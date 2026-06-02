import { z } from "zod";

export const zFeatures = z.object({
  orgs: z.boolean().optional(),
  relational: z.boolean().optional(),
});

export type Features = z.infer<typeof zFeatures>;
