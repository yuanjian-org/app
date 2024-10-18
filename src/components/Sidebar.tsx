/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import React from 'react';
import { signOut } from "next-auth/react";
import { LockIcon } from '@chakra-ui/icons';
import { FiChevronRight } from 'react-icons/fi';

import {
  Avatar,
  HStack,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Box,
  CloseButton,
  Flex,
  Icon,
  useColorModeValue,
  Link,
  Text,
  BoxProps,
  Divider,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useUserContext } from 'UserContext';
import { isPermitted } from 'shared/Role';
import yuanjianLogo80x80 from '../../public/img/yuanjian-logo-80x80.png';
import Image from "next/image";
import { useRouter } from 'next/router';
import { trpcNext } from 'trpc';
import { Mentorship } from 'shared/Mentorship';
import {
  MdChevronRight,
  MdFace,
  MdVideocam,
  MdSupervisorAccount,
  MdMic,
  MdLocalLibrary
} from 'react-icons/md';
import Role from "../shared/Role";
import { sidebarBreakpoint, sidebarWidth } from './Navbars';
import { formatUserName } from 'shared/strings';
import { AttachmentIcon } from '@chakra-ui/icons';
import { PiFlagCheckeredFill } from 'react-icons/pi';

export const sidebarContentMarginTop = 10;

interface SidebarItem {
  name: string,
  icon: React.ComponentType,
  path: string,
  regex: RegExp,
  roles?: Role | Role[],
}

interface DropdownMenuItem {
  name: string, 
  path?: string,
  roles?: Role | Role[],
  icon?: React.ReactNode,
  action?: () => void;
}

const managerDropdownMenuItems: DropdownMenuItem[] = [
  {
    name: '管理用户',
    path: '/users',
    roles: 'UserManager',
  },
  {
    name: '管理会议',
    path: '/groups',
    roles: 'GroupManager',
  },
  {
    name: '学生面试',
    path: '/interviews?type=mentee',
    roles: 'MentorshipManager',
  },
  {
    name: '导师面试',
    path: '/interviews?type=mentor',
    roles: 'MentorshipManager',
  }
];

const userDropdownMenuItems: DropdownMenuItem[] = [
  {
    name: '个人信息',
    path: '/profile',
  },
  {
    name: '谁能看到我的数据',
    path: '/who-can-see-my-data',
    icon: <LockIcon />
  },
  {
    name: '退出登录',
    action:() => signOut(),
  },
];

const sidebarItems: SidebarItem[] = [
  {
    name: '我的会议',
    path: '/',
    icon: MdVideocam,
    // match "/", "/groups/.*" but not "/groups/lab.*". "?" is a lookahead sign
    regex: /^\/$|\/groups\/(?!lab).*/,
  },
  {
    name: '资深导师页',
    path: '/coachees',
    icon: MdSupervisorAccount,
    regex: /^\/coachees/,
    roles: 'MentorCoach',
  },
  {
    name: '我的面试',
    path: '/interviews/mine',
    icon: MdMic,
    regex: /^\/interviews\/mine/,
    roles: 'Interviewer',
  },
  {
    name: '资源库',
    path: '/resources',
    icon: MdLocalLibrary,
    regex: /^\/resources$/,
    roles: ['Mentor', 'Mentee', 'MentorCoach'],
  },
  {
    name: '学生档案',
    path: '/mentees?menteeStatus=现届学子',
    icon: AttachmentIcon,
    regex: /^\/mentees/,
    roles: 'MentorshipManager',
  },
];

function mentorships2Items(mentorships: Mentorship[] | undefined): SidebarItem[] {
  if (!mentorships) return [];

  mentorships.sort((a, b) => {
    if ((a.endedAt === null) == (b.endedAt === null)) {
      return formatUserName(a.mentee.name).localeCompare(
        formatUserName(b.mentee.name));
    } else {
      return a.endedAt === null ? -1 : 1;
    }
  });

  return mentorships.map(m => ({
    name: formatUserName(m.mentee.name),
    icon: m.endedAt === null ? MdFace : PiFlagCheckeredFill,
    path: `/mentees/${m.mentee.id}`,
    regex: new RegExp(`^\/mentees\/${m.mentee.id}`),
  }));
}

const sidebarItemPaddingY = 4;

interface SidebarProps extends BoxProps {
  onClose: () => void;
}

const Sidebar = ({ onClose, ...rest }: SidebarProps) => {
  const [me] = useUserContext();
  // Save an API call if the user is not a mentor.
  const { data: mentorships } = isPermitted(me.roles, "Mentor") ?
    trpcNext.mentorships.listMineAsMentor.useQuery() : { data: undefined };
  const mentorshipItems = mentorships2Items(mentorships);

  return (
    <Box
      transition="3s ease"
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: "full", [sidebarBreakpoint]: sidebarWidth }}
      pos="fixed"
      h="full"
      {...rest}>
      <Flex
        direction="column"
        justifyContent="space-between"
        // If there are many items in the sidebar or in a smaller screen size, 
        // we need to enable scrolling to access the items and user menu.
        overflowY="auto"
        h="full">
        <Box>
          <Flex
            alignItems="center"
            marginX="8"
            marginTop="8"
            justifyContent="space-between">
            <Box display={{ base: 'none', [sidebarBreakpoint]: 'flex' }}>
              <NextLink href="http://mentors.org.cn/static" target="_blank">
                <Image
                  src={yuanjianLogo80x80}
                  alt="图标"
                  width={30}
                  // Without `priority` we would get a warning from Chrome that this
                  // image "was detected as the Largest Contentful Paint (LCP).
                  // Please add the "priority" property if this image is above the
                  // fold. Read more:
                  // https://nextjs.org/docs/api-reference/next/image#priority"
                  priority
                />
              </NextLink>
            </Box>
            <CloseButton display={{ base: 'flex', [sidebarBreakpoint]: 'none' }} 
              onClick={onClose} />
          </Flex>
          <Box height={{
            base: 0,
            [sidebarBreakpoint]: sidebarContentMarginTop - sidebarItemPaddingY,
          }} />

          {sidebarItems
            .filter(item => isPermitted(me.roles, item.roles))
            .map(item => <SidebarRow key={item.path} item={item} 
                          onClose={onClose} />)}
          <ManagerDropdownMenu />
          {mentorshipItems?.length > 0 && <Divider marginY={2} />}
          {mentorshipItems.map(item => <SidebarRow key={item.path} item={item}
            onClose={onClose} />)}
        </Box>
        <UserDropdownMenu />
      </Flex>
    </Box >
  );
};

export default Sidebar;

function UserDropdownMenu() {
  const [user] = useUserContext();
  const name = formatUserName(user.name);
  const backgroundColor = useColorModeValue('white', 'gray.900');
  const boderColor = useColorModeValue('gray.200', 'gray.700'); 

  return <Menu placement='right-start'>
    <DropdownMenuButton title={name} avatarName={name} />
    <MenuList bg={backgroundColor} borderColor={boderColor} zIndex="1000">
      {userDropdownMenuItems.map((item, index) =>
        <>
          <MenuItem key={item.path} as={item.path ? NextLink : undefined} 
            href={item.path} onClick={item.action}>{item.icon}{item.name}
          </MenuItem>
          {index < userDropdownMenuItems.length - 1 && <MenuDivider />}
        </>)}
    </MenuList>
  </Menu>;
}

function ManagerDropdownMenu() {
  const [user] = useUserContext();
  const roles = user.roles;
  const backgroundColor = useColorModeValue('white', 'gray.900');
  const boderColor = useColorModeValue('gray.200', 'gray.700'); 
  
  if (!isPermitted(roles, 
    ["UserManager", "GroupManager", "MentorshipManager"])) {
      return <></>;
  }

  const filteredItems = managerDropdownMenuItems
    .filter(item => isPermitted(roles, item.roles));
  return <Menu placement='right-start'> 
    <DropdownMenuButton title={"管理功能"} avatarName={""} />
    <MenuList bg={backgroundColor} borderColor={boderColor} zIndex="1000">
      {filteredItems.map((item, index) =>
        <>
          <MenuItem key={item.path} as={NextLink} href={item.path}>{item.name}
          </MenuItem>
          {index < filteredItems.length - 1 && <MenuDivider />}
        </>)}
    </MenuList>
  </Menu>;
}

const DropdownMenuButton = ({ title, avatarName 
} : { 
  title: string,
  avatarName: string,
}) => {
  return <MenuButton marginX={4} marginBottom={4} paddingLeft={4} py={2}
    transition="all 0.3s"  _focus={{ boxShadow: 'none' }}>
    <HStack>
      <Avatar size={'sm'} bg="brand.a" color="white" name={avatarName} />
        <Text display={{ base: 'flex', [sidebarBreakpoint]: 'flex' }}
          fontSize="sm">{title}</Text>
        <Box display={{ base: 'flex', [sidebarBreakpoint]: 'flex' }}>
          <FiChevronRight /></Box>
    </HStack>
  </MenuButton>;
};

const SidebarRow = ({ item, onClose, ...rest }: {
  item: SidebarItem,
} & SidebarProps) => {
  const router = useRouter();
  const active = item.regex.test(router.pathname) || item.regex.test(router.asPath);
  return (
    <Link
      as={NextLink}
      href={item.path}
      color={active ? "brand.c" : "gray.500"}
      fontWeight="bold"
      onClick={onClose}
    >
      <Flex
        align="center"
        marginX={4}
        paddingLeft={4}
        paddingY={sidebarItemPaddingY}
        role="group"
        cursor={active ? "default" : "pointer"}
        {...rest}
      >
        <Icon as={item.icon} />
        <Text marginX={4}>{item.name}</Text>
        <Icon
          as={MdChevronRight}
          opacity={0}
          _groupHover={active ? {} : { opacity: 100 }}
        />
      </Flex>
    </Link>
  );
};
