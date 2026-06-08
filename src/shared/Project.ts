import { z } from "zod";
import { zProjectProfile } from "./ProjectProfile";
import { zMinUser } from "./User";

export const zProjectStatus = z.enum(["Draft", "Open", "Closed"]);
export type ProjectStatus = z.TypeOf<typeof zProjectStatus>;

/**
 * Public: Visible to everyone, including non-registered users.
 * Confidential: Invisible to everyone for now (reserved for future).
 */
export const zProjectVisibility = z.enum(["Public", "Confidential"]);
export type ProjectVisibility = z.TypeOf<typeof zProjectVisibility>;

export const zProject = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string(),
  status: zProjectStatus,
  visibility: zProjectVisibility,
  profile: zProjectProfile.nullable(),
});

export type Project = z.TypeOf<typeof zProject>;

export const zProjectWithOwner = zProject.extend({
  owner: zMinUser,
});

export type ProjectWithOwner = z.TypeOf<typeof zProjectWithOwner>;
