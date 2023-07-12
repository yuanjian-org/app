import { ArrayElement } from "./ArrayElement";
import z from "zod";

export const AllRoles = [
  'UserManager',
  'GroupManager',
  'SummaryEngineer',
  'PartnershipManager',
  'PartnershipAssessor',
  'Mentor',
  'Mentee',
] as const;

export const RoleProfiles: { [key: string]: {
  // You may ask, why not simply use displayName as the role key?
  // Well, we're just too lazy to type Chinese characters everywhere.
  displayName: string,
  actions: string,
  privileged: boolean,
}} = {
  UserManager: {
    displayName: '用户管理员',
    actions: '管理用户信息和授权角色',
    privileged: true,
  },
  GroupManager: {
    displayName: '分组管理员',
    actions: '管理会议分组',
    privileged: true,
  },
  SummaryEngineer: {
    displayName: '摘要工程师',
    actions: '研发自动会议摘要功能',
    privileged: true,
  },
  PartnershipManager: {
    displayName: '导师匹配管理员',
    actions: '管理导师匹配',
    privileged: true,
  },
  PartnershipAssessor: {
    displayName: '跟踪评估员',
    actions: '跟踪评估一对一导师辅导效果',
    privileged: true,
  },
  Mentor: {
    displayName: '导师',
    actions: '帮助年轻学子成长',
    privileged: false,
  },
  Mentee: {
    displayName: '学生',
    actions: '接受导师辅助',
    privileged: false,
  },
}

type Role = ArrayElement<typeof AllRoles>;

export default Role;

export const zRoles = z.array(z.enum(AllRoles));

/**
 * @param permitted When absent, this function always returns true.
 */
export function isPermitted(userRoles : Role[], permitted?: Role | Role[]) {
  if (permitted === undefined) return true;
  if (typeof permitted === 'string') return userRoles.includes(permitted);
  return userRoles.some(r => permitted.includes(r));
}
