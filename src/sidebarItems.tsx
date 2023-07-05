import {
  MdPerson,
  MdHome,
  MdGroups,
  MdScience,
} from 'react-icons/md'
import Role from "./shared/Role";
import { IconType } from "react-icons";

export interface SidebarItem {
  name: string,
  icon: IconType,
  path: string,
  role?: Role,
}

const sidebarItems: SidebarItem[] = [
  {
    name: '我的会议',
    path: '/',
    icon: MdHome,
  },
  {
    name: '摘要研发',
    path: '/groups/lab',
    icon: MdScience,
    role: 'SummaryEngineer',
  },
  {
    name: '用户管理',
    path: '/users',
    icon: MdPerson,
    role: 'UserManager',
  },
  {
    name: '分组管理',
    path: '/groups',
    icon: MdGroups,
    role: 'GroupManager',
  },
]

export default sidebarItems;
