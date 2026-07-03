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
   * - Prompting mentees to complete their profile via a modal after login, when attempting to book a mentor, or when drafting a mentor selection.
   * - Showing the "学生自填信息" tab on the mentee details page.
   */
  menteeProfile: z.boolean().optional(),
});

export type Features = z.infer<typeof zFeatures>;

const publicRuntimeConfig = getConfig()?.publicRuntimeConfig || {};

export const features: Features = {
  orgs:
    publicRuntimeConfig.ENABLE_ORGS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_ORGS === "true"
      ? true
      : undefined,
  relational:
    publicRuntimeConfig.ENABLE_RELATIONAL === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_RELATIONAL === "true"
      ? true
      : undefined,
  volunteers:
    publicRuntimeConfig.ENABLE_VOLUNTEERS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_VOLUNTEERS === "true"
      ? true
      : undefined,
  interviews:
    publicRuntimeConfig.ENABLE_INTERVIEWS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_INTERVIEWS === "true"
      ? true
      : undefined,
  exams:
    publicRuntimeConfig.ENABLE_EXAMS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_EXAMS === "true"
      ? true
      : undefined,
  projects:
    publicRuntimeConfig.ENABLE_PROJECTS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PROJECTS === "true"
      ? true
      : undefined,
  menteeProfile:
    publicRuntimeConfig.ENABLE_MENTEE_PROFILE === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_MENTEE_PROFILE === "true"
      ? true
      : undefined,
};
