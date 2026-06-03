import { z } from "zod";

/**
 * Feature flags, controled by ENABLE_* env variables.
 */
export const zFeatures = z.object({
  // Organizations
  orgs: z.boolean().optional(),
  // Relational mentorship. When disabled, only transactional mentors are supported.
  relational: z.boolean().optional(),
});

export type Features = z.infer<typeof zFeatures>;
