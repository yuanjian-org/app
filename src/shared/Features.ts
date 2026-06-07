import { z } from "zod";

/**
 * Feature flags, controled by ENABLE_* env variables.
 */
export const zFeatures = z.object({
  // Organizations
  orgs: z.boolean().optional(),

  // Relational mentorship. When disabled, only transactional mentors are supported.
  relational: z.boolean().optional(),

  volunteers: z.boolean().optional(),
  interviews: z.boolean().optional(),
  exams: z.boolean().optional(),

  /**
   * Controls features related to the mentee's self-filled profile, including:
   * - Prompting mentees to complete their profile via a modal after login, when attempting to book a mentor, or when drafting a mentor selection.
   * - Showing the "学生自填信息" tab on the mentee details page.
   */
  menteeProfile: z.boolean().optional(),

  projects: z.boolean().optional(),
});

export type Features = z.infer<typeof zFeatures>;
