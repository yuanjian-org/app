import { ReactComponentElement } from "react";
import { Icon } from '@chakra-ui/react';
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
  icon?: IconType,
  secondary?: boolean,
  path: string,
  role?: Role,
}

export const sidebarItems: SidebarItem[] = [
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

// NextJS Requirement. TODO: This function is out of place and only used by Horizon UI.
export const isWindowAvailable = () => typeof window !== "undefined";

const findCurrentRoute = (routes: SidebarItem[]) => {
  const foundRoute = routes.find(
    (route) =>
      isWindowAvailable() &&
      window.location.href.indexOf('/' + route.path) !== -1 &&
      route
  );

  return foundRoute;
};

export const getActiveRoute = (routes: SidebarItem[]): string => {
  const route = findCurrentRoute(routes);
  return route?.name || "Default Brand Text";
};

export const getActiveSidebar = (routes: SidebarItem[]): boolean => {
  const route = findCurrentRoute(routes);
  return route?.secondary ?? false;
};

export const getActiveSidebarText = (routes: SidebarItem[]): string | boolean => {
  return getActiveRoute(routes) || false;
};
