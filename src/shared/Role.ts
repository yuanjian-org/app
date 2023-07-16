import { ArrayElement } from "./ArrayElement";
import z from "zod";

export const AllRoles = [
  'SystemAlertSubscriber',
  'PrivilegedRoleManager',
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

  // If the role can access user data without explicit relations with the user (e.g. mentor-mentee relation)
  privilegedUserDataAccess: boolean,
}} = {
  SystemAlertSubscriber: {
    displayName: '系统报警监听员',
    actions: '接受并处理系统异常事件的报警',
    privileged: true,
    privilegedUserDataAccess: false,
  },
  PrivilegedRoleManager: {
    displayName: '特权角色管理员',
    actions: '管理特权角色',
    privileged: true,
    privilegedUserDataAccess: false,
  },
  UserManager: {
    displayName: '用户管理员',
    actions: '管理用户信息和角色',
    privileged: true,
    privilegedUserDataAccess: true,
  },
  GroupManager: {
    displayName: '分组管理员',
    actions: '管理会议分组',
    privileged: true,
    privilegedUserDataAccess: true,
  },
  SummaryEngineer: {
    displayName: '摘要工程师',
    actions: '研发自动会议摘要功能',
    privileged: true,
    privilegedUserDataAccess: true,
  },
  PartnershipManager: {
    displayName: '一对一导师管理员',
    actions: '管理导师匹配',
    privileged: true,
    privilegedUserDataAccess: false,
  },
  PartnershipAssessor: {
    displayName: '一对一导师评估员',
    actions: '跟踪评估一对一导师辅导效果',
    privileged: true,
    privilegedUserDataAccess: true,
  },
  Mentor: {
    displayName: '导师',
    actions: '帮助年轻学子成长',
    privileged: false,
    privilegedUserDataAccess: false,
  },
  Mentee: {
    displayName: '学生',
    actions: '接受导师辅助',
    privileged: false,
    privilegedUserDataAccess: false,
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
