import { ArrayElement } from "./ArrayElement";
import z from "zod";

export const AllRoles = [
  'SystemAlertSubscriber',
  'RoleManager',
  'UserManager',
  'GroupManager',
  'SummaryEngineer',
  'MentorshipManager',
  'MentorshipAssessor',
  'InterviewManager',
  'Mentor',
  'Mentee',
  'Interviewer',
  'MentorCoach',

  // Deprecated
  'PrivilegedRoleManager',
  'PartnershipManager',
  'PartnershipAssessor',
] as const;

export const RoleProfiles: { [key: string]: {
  // You may ask, why not simply use displayName as the role key?
  // Well, we're just too lazy to type Chinese characters everywhere.
  displayName: string,

  actions: string,

  // If the role can be automatically added to or removed from users.
  automatic?: boolean,

  // If the role can access user data without explicit relations with the user (e.g. mentor-mentee relation)
  privilegedUserDataAccess: boolean,
}} = {
  SystemAlertSubscriber: {
    displayName: '系统报警监听员',
    actions: '接受并处理系统异常事件的报警',
    privilegedUserDataAccess: false,
  },
  RoleManager: {
    displayName: '角色管理员',
    actions: '管理用户角色',
    privilegedUserDataAccess: false,
  },
  UserManager: {
    displayName: '用户管理员',
    actions: '管理用户基本信息',
    privilegedUserDataAccess: true,
  },
  GroupManager: {
    displayName: '分组管理员',
    actions: '管理会议分组',
    privilegedUserDataAccess: true,
  },
  SummaryEngineer: {
    displayName: '摘要工程师',
    actions: '研发自动会议摘要功能',
    privilegedUserDataAccess: true,
  },
  MentorshipManager: {
    displayName: '一对一导师管理员',
    actions: '管理导师匹配',
    privilegedUserDataAccess: false,
  },
  MentorshipAssessor: {
    displayName: '一对一导师评估员',
    actions: '跟踪评估一对一导师辅导效果',
    privilegedUserDataAccess: true,
  },
  InterviewManager: {
    displayName: '面试管理员',
    actions: '管理导师与学生面试',
    privilegedUserDataAccess: true,
  },
  Mentor: {
    displayName: '导师',
    actions: '帮助年轻学子成长',
    privilegedUserDataAccess: false,
    automatic: true,
  },
  Mentee: {
    displayName: '学生',
    actions: '接受导师辅助',
    privilegedUserDataAccess: false,
    automatic: true,
  },
  Interviewer: {
    displayName: '面试官',
    actions: '面试导师或学生候选人',
    privilegedUserDataAccess: false,
    automatic: true,
  },
  MentorCoach: {
    displayName: '资深导师',
    actions: '辅助与评估非资深导师',
    privilegedUserDataAccess: true,
    automatic: true,
  },

  // Deprecated
  PrivilegedRoleManager: {
    displayName: 'Deprecated',
    actions: '管理用户角色',
    privilegedUserDataAccess: false,
  },
  PartnershipManager: {
    displayName: 'Deprecated',
    actions: '管理导师匹配',
    privilegedUserDataAccess: false,
  },
  PartnershipAssessor: {
    displayName: 'Deprecated',
    actions: '跟踪评估一对一导师辅导效果',
    privilegedUserDataAccess: false,
  },
};

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
