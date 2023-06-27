import { ReactComponentElement } from "react";
import { Icon } from '@chakra-ui/react'
import {
  MdPerson,
  MdHome,
  MdAccountBox
} from 'react-icons/md'

export interface Route {
  name: string;
  // @ts-ignore
  icon: ReactComponentElement | string;
  secondary?: boolean;
  path: string;
  hiddenFromSidebar?: boolean;
}

const routes: Route[] = [
  {
    name: '我的会议',
    path: '/',
    icon: <Icon as={MdHome} width='20px' height='20px' color='inherit' />,
  },
  {
    name: '个人信息',
    path: '/profile',
    icon: <Icon as={MdAccountBox} width='20px' height='20px' color='inherit' />,
    hiddenFromSidebar: true,
  },
  {
    name: '会议详情',
    path: '/groups/[groupId]',
    icon: <Icon as={MdAccountBox} width='20px' height='20px' color='inherit' />,
    hiddenFromSidebar: true,
  },
  {
    name: '摘要',
    path: '/groups/[groupId]/transcripts/[transcriptId]',
    icon: <Icon as={MdAccountBox} width='20px' height='20px' color='inherit' />,
    hiddenFromSidebar: true,
  },
  {
    name: '用户管理',
    path: '/users',
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
  },
  {
    name: '分组管理',
    path: '/groups',
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
  },
]

export default routes;
