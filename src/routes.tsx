import { Icon } from '@chakra-ui/react'
import {
  MdPerson,
  MdHome,
  MdAccountBox
} from 'react-icons/md'

import { IRoute } from 'horizon-ui/types/navigation'

const routes: IRoute[] = [
  {
    name: '会议列表',
    layout: '/',
    path: '/',
    icon: <Icon as={MdHome} width='20px' height='20px' color='inherit' />,
    resource: 'meeting:read',
  },
  {
    name: '个人信息',
    layout: '/',
    path: '/user-profile',
    icon: <Icon as={MdAccountBox} width='20px' height='20px' color='inherit' />,
    resource: 'profile:write',
    hiddenFromSidebar: true,
  },
  {
    name: '用户管理',
    layout: '/',
    path: '/user-management',
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
    resource: 'user-management:write',
  },
  {
    name: '分组管理',
    layout: '/',
    path: '/group-management',
    icon: <Icon as={MdPerson} width='20px' height='20px' color='inherit' />,
    resource: 'group-management:write',
  },
]

export default routes
