import { z } from "zod";
import { zMinUser } from "./User";

export const zProject = z.object({
  id: z.string(),
  creatorId: z.string(),
  title: z.string(),
  background: z.string(),
  description: z.string(),
  videoUrl: z.string(),
  studentPersona: z.string(),
  requireLogin: z.boolean(),
  isPublished: z.boolean(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),

  creator: zMinUser.optional(),
});
export type Project = z.TypeOf<typeof zProject>;

export const zProjectApplication = z.object({
  id: z.string(),
  projectId: z.string(),
  applicantId: z.string(),
  content: z.string(),
  status: z.enum(["Pending", "Accepted", "Rejected"]),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),

  applicant: zMinUser.optional(),
  project: zProject.optional(),
});
export type ProjectApplication = z.TypeOf<typeof zProjectApplication>;
