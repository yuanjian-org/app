import { z } from "zod";
import getConfig from "next/config";

/**
 * Feature flags, controled by NEXT_PUBLIC_ENABLE_* env variables.
 */
export const zFeatures = z.object({
  // Organizations
  orgs: z.boolean().optional(),

  // Relational mentorship. When disabled, only transactional mentors are supported.
  relational: z.boolean().optional(),

  volunteers: z.boolean().optional(),
  interviews: z.boolean().optional(),
  exams: z.boolean().optional(),

  // X-Challenge and X-Idea projects
  projects: z.boolean().optional(),

  /**
   * Controls features related to the mentee's self-filled profile, including:
   * - Prompting mentees to complete their profile via a modal after login, when
   *   attempting to book a mentor, or when drafting a mentor selection.
   * - Showing the "学生自填信息" tab on the mentee details page.
   */
  menteeProfile: z.boolean().optional(),

  english: z.boolean().optional(),
});

export type Features = z.infer<typeof zFeatures>;

/**
 * N.B. Some places in the codebase use process.env to get features directly to
 * enable dead code elimination or DCE (Tree Shaking isn't smart enough to
 * dereference constants at build time). Please keep them in sync.
 */
const env = getConfig()?.publicRuntimeConfig || process.env;

export const features: Features = {
  orgs: env.NEXT_PUBLIC_ENABLE_ORGS === "true" || undefined,
  relational: env.NEXT_PUBLIC_ENABLE_RELATIONAL === "true" || undefined,
  volunteers: env.NEXT_PUBLIC_ENABLE_VOLUNTEERS === "true" || undefined,
  interviews: env.NEXT_PUBLIC_ENABLE_INTERVIEWS === "true" || undefined,
  exams: env.NEXT_PUBLIC_ENABLE_EXAMS === "true" || undefined,
  projects: env.NEXT_PUBLIC_ENABLE_PROJECTS === "true" || undefined,
  menteeProfile: env.NEXT_PUBLIC_ENABLE_MENTEE_PROFILE === "true" || undefined,
  english: env.NEXT_PUBLIC_ENABLE_ENGLISH === "true" || undefined,
};
