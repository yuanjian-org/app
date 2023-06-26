import { Icon } from '@chakra-ui/react'
import {
  MdPerson,
  MdHome,
  MdAccountBox
} from 'react-icons/md'

import { IRoute } from 'horizon-ui/types/navigation'

const routes: IRoute[] = [
  {
    name: '我的会议',
    // layout: '/',
    path: '/',
    icon: <Icon as={MdHome} width='20px' height='20px' color='inherit' />,
    resource: 'my-groups:read',
  },
  {
    name: '个人信息',
    path: '/profile',
    icon: <Icon as={MdAccountBox} width='20px' height='20px' color='inherit' />,
    resource: 'me:write',
    hiddenFromSidebar: true,
  },
  {
    name: '会议详情',
    path: '/groups/[groupId]',
    icon: <Icon as={MdAccountBox} width='20px' height='20px' color='inherit' />,
    // Permission varies based on `id`.
    resource: 'open-to-all',
    hiddenFromSidebar: true,
  },
  {
    name: '摘要',
    path: '/groups/[groupId]/transcripts/[transcriptId]',
    icon: <Icon as={MdAccountBox} width='20px' height='20px' color='inherit' />,
    // Permission varies based on `id`.
    resource: 'open-to-all',
    hiddenFromSidebar: true,
  },
  {
    name: '用户管理',
    path: '/users',
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
    resource: 'users:write',
  },
  {
    name: '分组管理',
    path: '/groups',
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
    resource: 'groups:write',
  },
]

export default routes
