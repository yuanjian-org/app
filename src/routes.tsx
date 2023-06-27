import { ReactComponentElement } from "react";
import { Icon } from '@chakra-ui/react'
import {
  MdPerson,
  MdHome,
} from 'react-icons/md'
import { Role } from "shared/RBAC";

export interface Route {
  name: string;
  // @ts-ignore
  icon: ReactComponentElement | string;
  secondary?: boolean;
  path: string;
  role: Role,
}

const routes: Route[] = [
  {
    name: '我的会议',
    path: '/',
    icon: <Icon as={MdHome} width='20px' height='20px' color='inherit' />,
    role: 'ANYONE',
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
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
    role: 'ADMIN',
  },
]

export default routes;
