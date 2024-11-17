import z from "zod";

export const AllRoles = [
  'SystemAlertSubscriber',
  'UserManager',
  'GroupManager',
  'MentorshipAssessor',
  'MentorshipManager',
  'AdhocMentor',
  'Mentor',
  'Mentee',
  'Interviewer',
  'MentorCoach',

  // Banned users can't sign in. Mostly to prevent users from repeatedly using
  // different email addresses than their main sign-in address.
  'Banned',

  // Deprecated
  // 'MenteeManager',
] as const;

export const RoleProfiles: { [key: string]: {
  // Why not simply use displayName as the role key? We're too lazy to type
  // Chinese characters everywhere.
  displayName: string,

  actions: string,

  // If the role can be automatically added to or removed from users.
  automatic?: boolean,

  // If the role can access user data without explicit relations with the user
  // (e.g. mentor-mentee relation)
  privilegedUserDataAccess?: boolean,
}} = {
  SystemAlertSubscriber: {
    displayName: '系统报警监听员',
    actions: '接受并处理系统异常事件的报警',
  },
  UserManager: {
    displayName: '用户管理员',
    actions: '管理用户基本信息',
    privilegedUserDataAccess: true,
  },
  GroupManager: {
    displayName: '会议管理员',
    actions: '管理会议分组和会议纪要',
    privilegedUserDataAccess: true,
  },
  MentorshipAssessor: {
    displayName: '一对一导师评估员',
    actions: '跟踪评估一对一导师辅导效果',
    privilegedUserDataAccess: true,
  },
  MentorshipManager: {
    displayName: '学生导师管理员',
    actions: '管理学生信息、导师信息、面试信息、一对一学生导师匹配信息等',
    privilegedUserDataAccess: true,
  },
  Mentor: {
    displayName: '导师',
    actions: '帮助年轻学子成长',
    automatic: true,
  },
  AdhocMentor: {
    displayName: '仅不定期导师',
    actions: '仅做不定期服务，不参与学生匹配',
  },
  Mentee: {
    displayName: '学生',
    actions: '接受导师辅助',
    automatic: true,
  },
  Interviewer: {
    displayName: '面试官',
    actions: '面试导师或学生候选人',
    automatic: true,
  },
  MentorCoach: {
    displayName: '资深导师',
    actions: '辅助与评估非资深导师',
    privilegedUserDataAccess: true,
    automatic: true,
  },

  Banned: {
    displayName: '停用账号',
    actions: '停用账号无法登录系统。主要为防止用户使用非主登录邮箱',
  },

  // // Deprecated
  // MenteeManager: {
  //   displayName: 'Deprecated',
  //   actions: '管理学生',
  // },
};

type Role = typeof AllRoles[number];

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
