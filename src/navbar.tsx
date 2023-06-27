import { ReactComponentElement } from "react";
import { Icon } from '@chakra-ui/react';
import {
  MdPerson,
  MdHome,
  MdGroups,
  MdScience,
} from 'react-icons/md'
import { Role } from "shared/RBAC";

export interface NavbarItem {
  name: string,
  // @ts-ignore
  icon: ReactComponentElement | string,
  secondary?: boolean,
  path: string,
  role: Role,
}

export const navbarItems: NavbarItem[] = [
  {
    name: '我的会议',
    path: '/',
    icon: <Icon as={MdHome} width='20px' height='20px' color='inherit' />,
    role: 'Anyone',
  },
  {
    name: '用户管理',
    path: '/users',
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
    role: 'ADMIN',
  },
  {
    name: '分组管理',
    path: '/groups',
    icon: <Icon as={MdGroups} width='20px' height='20px' color='inherit' />,
    role: 'ADMIN',
  },
  {
    name: '摘要研发',
    path: '#',
    icon: <Icon as={MdScience} width='20px' height='20px' color='inherit' />,
    role: 'ADMIN',
  },
]

// NextJS Requirement. TODO: This function is out of place
export const isWindowAvailable = () => typeof window !== "undefined";

export const findCurrentRoute = (routes: NavbarItem[]) => {
  const foundRoute = routes.find(
    (route) =>
      isWindowAvailable() &&
      window.location.href.indexOf('/' + route.path) !== -1 &&
      route
  );

  return foundRoute;
};

export const getActiveRoute = (routes: NavbarItem[]): string => {
  const route = findCurrentRoute(routes);
  return route?.name || "Default Brand Text";
};

export const getActiveNavbar = (routes: NavbarItem[]): boolean => {
  const route = findCurrentRoute(routes);
  return route?.secondary ?? false;
};

export const getActiveNavbarText = (routes: NavbarItem[]): string | boolean => {
  return getActiveRoute(routes) || false;
};
