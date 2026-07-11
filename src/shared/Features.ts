import { z } from "zod";

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

  // Public Orgs and Mentors
  publicOrgsMentors: z.boolean().optional(),

  /**
   * Controls features related to the mentee's self-filled profile, including:
   * - Prompting mentees to complete their profile via a modal after login, when
   *   attempting to book a mentor, or when drafting a mentor selection.
   * - Showing the "学生自填信息" tab on the mentee details page.
   */
  menteeProfile: z.boolean().optional(),

  english: z.boolean().optional(),

  academicProfiles: z.boolean().optional(),
});

export type Features = z.infer<typeof zFeatures>;

/**
 * N.B. Some places in the codebase use process.env to get features directly to
 * enable dead code elimination or DCE (Tree Shaking isn't smart enough to
 * dereference constants at build time). Please keep them in sync.
 */
export const features: Features = {
  orgs: process.env.NEXT_PUBLIC_ENABLE_ORGS === "true" || undefined,
  relational: process.env.NEXT_PUBLIC_ENABLE_RELATIONAL === "true" || undefined,
  volunteers: process.env.NEXT_PUBLIC_ENABLE_VOLUNTEERS === "true" || undefined,
  interviews: process.env.NEXT_PUBLIC_ENABLE_INTERVIEWS === "true" || undefined,
  exams: process.env.NEXT_PUBLIC_ENABLE_EXAMS === "true" || undefined,
  projects: process.env.NEXT_PUBLIC_ENABLE_PROJECTS === "true" || undefined,
  publicOrgsMentors:
    process.env.NEXT_PUBLIC_ENABLE_PUBLIC_ORGS_MENTORS === "true" || undefined,
  menteeProfile:
    process.env.NEXT_PUBLIC_ENABLE_MENTEE_PROFILE === "true" || undefined,
  english: process.env.NEXT_PUBLIC_ENABLE_ENGLISH === "true" || undefined,
  academicProfiles:
    process.env.NEXT_PUBLIC_ACADEMIC_PROFILES === "true" || undefined,
};
