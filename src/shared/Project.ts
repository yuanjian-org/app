import { z } from "zod";
import { zProjectProfile } from "./ProjectProfile";
import { zMinUser } from "./User";

export const zProjectStatus = z.enum(["Draft", "Open", "Closed"]);
export type ProjectStatus = z.TypeOf<typeof zProjectStatus>;

export const ProjectStatusLabel: Record<ProjectStatus, string> = {
  Draft: "草稿",
  Open: "招募中",
  Closed: "已结束",
};

export const ProjectStatusDesc: Record<ProjectStatus, string> = {
  Draft: "项目正在编辑中，尚未发布。",
  Open: "项目已经发布，正在招募成员。",
  Closed: "项目招募已经结束或项目已经关闭。",
};

/**
 * Public: Visible to everyone, including non-registered users.
 * Confidential: Invisible to everyone for now (reserved for future).
 */
export const zProjectVisibility = z.enum(["Public", "Confidential"]);
export type ProjectVisibility = z.TypeOf<typeof zProjectVisibility>;

export const ProjectVisibilityLabel: Record<ProjectVisibility, string> = {
  Public: "公开",
  Confidential: "保密",
};

export const ProjectVisibilityDesc: Record<ProjectVisibility, string> = {
  Public: "任何人均可查看该项目。",
  Confidential: "仅部分有权限的用户可查看该项目。",
};

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
