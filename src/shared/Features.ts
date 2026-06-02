import { z } from "zod";

export const zFeatures = z.object({
  orgs: z.boolean(),
  relational: z.boolean(),
});

export type Features = z.infer<typeof zFeatures>;
