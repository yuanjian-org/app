import { z } from "zod";
import { zUser } from "./User";

export const zProjectApplicationStatus = z
  .enum(["已批准", "已拒绝"])
  .nullable();
export type ProjectApplicationStatus = z.TypeOf<
  typeof zProjectApplicationStatus
>;

export const zProjectApplication = z.object({
  id: z.string(),
  projectId: z.string(),
  userId: z.string(),
  status: zProjectApplicationStatus,
  application: z.record(z.string(), z.any()),
});

export type ProjectApplication = z.TypeOf<typeof zProjectApplication>;

export const zProjectApplicationWithUser = zProjectApplication.extend({
  user: zUser,
});

export type ProjectApplicationWithUser = z.TypeOf<
  typeof zProjectApplicationWithUser
>;
