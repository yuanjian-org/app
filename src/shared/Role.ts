import { ArrayElement } from "./ArrayElement";
import z from "zod";

export const AllRoles = [
  'UserManager',
  'GroupManager',
  'SummaryEngineer',
] as const;

export const RoleProfiles: { [key: string]: {
  // You may ask, why not simply use displayName as the role key?
  // Well, we're just too lazy to type Chinese characters everywhere.
  displayName: string,
  actions: string,
  dataAccess: string,
}} = {
  UserManager: {
    displayName: '用户管理员',
    actions: '管理用户信息和角色',
    dataAccess: '所有用户的email和角色',
  },
  GroupManager: {
    displayName: '分组管理员',
    actions: '管理分组',
    dataAccess: '所有用户的email',
  },
  SummaryEngineer: {
    displayName: '摘要工程师',
    actions: '研发自动会议摘要功能',
    dataAccess: '所有会议的转录文字、摘要，以及用户对摘要的反馈和手工修改',
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
