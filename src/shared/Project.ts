import { z } from "zod";
import { zMinUser } from "./User";

export const zProjectProfile = z
  .object({
    Background: z.string().optional(),
    "Challenge Description": z.string().optional(),
    Video: z.string().optional(),
    学生画像要求: z.string().optional(),
  })
  .catchall(z.any());
export type ProjectProfile = z.TypeOf<typeof zProjectProfile>;

export const zProject = z.object({
  id: z.string(),
  creatorId: z.string(),
  title: z.string(),
  profile: zProjectProfile,
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
