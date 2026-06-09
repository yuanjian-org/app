import { z } from "zod";
import { zProjectProfile } from "./ProjectProfile";
import { zMinUser } from "./User";

export const zProjectStatus = z.enum(["草稿", "招募中", "已结束"]);
export type ProjectStatus = z.TypeOf<typeof zProjectStatus>;

export const ProjectStatusDescriptions: Record<ProjectStatus, string> = {
  草稿: "项目还在编辑中，未正式发布",
  招募中: "项目正在招募成员",
  已结束: "项目已经结束",
};

/**
 * 公开: Visible to everyone, including non-registered users.
 * 保密: Invisible to everyone for now (reserved for future).
 */
export const zProjectVisibility = z.enum(["公开", "保密"]);
export type ProjectVisibility = z.TypeOf<typeof zProjectVisibility>;

export const ProjectVisibilityDescriptions: Record<ProjectVisibility, string> =
  {
    公开: "所有人可见（包括未注册用户）",
    保密: "暂时不对外可见（为未来保留）",
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
