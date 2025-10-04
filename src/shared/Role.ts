import z from "zod";

export const allRoles = [
  "SystemAlertSubscriber",
  "UserManager",
  "GroupManager",
  "MentorshipAssessor",
  "MentorshipManager",
  "MentorshipOperator",

  // See `docs/Glossary.md` for the definitions of this type.
  "TransactionalMentor",
  // Mentor role is either a transactional or relational mentor.
  "Mentor",
  "Mentee",
  "Interviewer",
  "Volunteer",
] as const;

type Role = (typeof allRoles)[number];

export default Role;

export const zRoles = z.array(z.enum(allRoles));

/**
 * Use `rp()` to access this object for type safety.
 */
const RoleProfiles: {
  [key: string]: {
    // Why not simply use displayName as the role key? We're too lazy to type
    // Chinese characters everywhere.
    displayName: string;

    actions: string;

    // If the role can be automatically added to or removed from users.
    automatic?: boolean;

    // If the role can access user data without explicit relations with the user
    // (e.g. mentor-mentee relation)
    privilegedUserDataAccess?: boolean;
  };
} = {
  SystemAlertSubscriber: {
    displayName: "系统报警监听员",
    actions: "接受并处理系统异常事件的报警",
  },
  UserManager: {
    displayName: "用户管理员",
    actions: "管理用户基本信息",
    privilegedUserDataAccess: true,
  },
  GroupManager: {
    displayName: "会议管理员",
    actions: "管理会议分组和会议纪要",
    privilegedUserDataAccess: true,
  },
  MentorshipAssessor: {
    displayName: "一对一导师评估员",
    actions: "跟踪评估一对一导师辅导效果",
    privilegedUserDataAccess: true,
  },
  MentorshipManager: {
    displayName: "师生管理员",
    actions: "管理学生信息、导师信息、面试信息、一对一学生导师匹配信息等",
    privilegedUserDataAccess: true,
  },
  MentorshipOperator: {
    displayName: "师生运营员",
    actions: "协助导师和学生活动的运营",
    privilegedUserDataAccess: true,
  },
  Mentor: {
    displayName: "导师",
    actions: "帮助年轻学子成长",
    automatic: true,
  },
  TransactionalMentor: {
    displayName: "仅不定期导师",
    actions: "仅做不定期服务，不参与学生匹配",
  },
  Mentee: {
    displayName: "学生",
    actions: "接受导师辅助",
    automatic: true,
  },
  Interviewer: {
    displayName: "面试官",
    actions: "面试导师或学生候选人",
    automatic: true,
  },
  Volunteer: {
    displayName: "志愿者",
    actions: "可以浏览其他志愿者信息",
  },
};

export function roleProfile(role: Role) {
  return RoleProfiles[role];
}

export function displayName(role: Role) {
  return RoleProfiles[role].displayName;
}

/**
 * @param permitted When absent, this function always returns true.
 */
export function isPermitted(userRoles: Role[], permitted?: Role | Role[]) {
  if (permitted === undefined) return true;
  if (typeof permitted === "string") return userRoles.includes(permitted);
  return userRoles.some((r) => permitted.includes(r));
}

/**
 * TODO update codebase to use this function instead of manually removing roles
 */
export function removeRole(roles: Role[], role: Role) {
  return roles.filter((r) => r !== role);
}

/**
 * TODO update codebase to use this function instead of manually adding roles
 */
export function addRole(roles: Role[], role: Role) {
  // Remove the role if it already exists to avoid duplicates
  return [...removeRole(roles, role), role];
}
