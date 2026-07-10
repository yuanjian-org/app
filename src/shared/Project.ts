import { z } from "zod";
import { zProjectProfile } from "./ProjectProfile";
import { zMinUser } from "./User";
import { zOrg } from "./Org";

export const zProjectStatus = z.enum(["草稿", "招募中", "已结束"]);
export type ProjectStatus = z.TypeOf<typeof zProjectStatus>;

export const ProjectStatusDescriptions: Record<ProjectStatus, string> = {
  草稿: "项目还在编辑中，不对外可见",
  招募中: "项目正在招募成员，对外可见",
  已结束: "项目已经结束，不对外可见",
};

/**
 * 公开: Visible to everyone, including non-registered users.
 * 未列出: Only accessible via direct link, hidden from lists.
 */
export const zProjectVisibility = z.enum(["公开", "未列出"]);
export type ProjectVisibility = z.TypeOf<typeof zProjectVisibility>;

export const ProjectVisibilityDescriptions: Record<ProjectVisibility, string> =
  {
    公开: "所有人可见（包括未注册用户）",
    未列出: "仅通过链接访问，不在列表中展示",
  };

export const zProject = z.object({
  id: z.string(),
  ownerId: z.string(),
  orgId: z.string().nullable(),
  title: z.string(),
  status: zProjectStatus,
  visibility: zProjectVisibility,
  profile: zProjectProfile.nullable(),
});

export type Project = z.TypeOf<typeof zProject>;

export const zProjectWithAssociation = zProject.extend({
  owner: zMinUser,
  org: zOrg.pick({ id: true, name: true }).nullable(),
});

export type ProjectWithAssociation = z.TypeOf<typeof zProjectWithAssociation>;
