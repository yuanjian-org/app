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
  MdLocalLibrary,
  MdPerson2,
} from 'react-icons/md';
import Role from "../shared/Role";
import { sidebarBreakpoint, sidebarWidth } from './Navbars';
import { formatUserName } from 'shared/strings';
import { AttachmentIcon } from '@chakra-ui/icons';
import { PiFlagCheckeredFill } from 'react-icons/pi';
import { componentSpacing } from 'theme/metrics';

export const sidebarContentMarginTop = 10;
const sidebarPaddingTop = 8;
const sidebarItemPaddingY = 4;
const sidebarItemPaddingLeft = 8;
const bgColorModeValues = ['white', 'gray.900'];
const borderColorModeValues = ['gray.200', 'gray.700'];
const siderbarTextColor = "gray.500";

interface SidebarItem {
  name: string,
  icon: React.ComponentType,
  path: string,
  regex: RegExp,
  roles?: Role | Role[],
}

interface DropdownMenuItem {
  name: string, 
  // string url as the href attribute and function as the onClick handler.
  action: (() => void) | string,
  roles?: Role | Role[],
  icon?: React.ReactNode,
}

const managerDropdownMenuItems: DropdownMenuItem[] = [
  {
    name: '学生面试',
    action: '/interviews?type=mentee',
    roles: 'MentorshipManager',
  },
  {
    name: '导师面试',
    action: '/interviews?type=mentor',
    roles: 'MentorshipManager',
  },
  {
    name: '管理会议',
    action: '/groups',
    roles: 'GroupManager',
  },
  {
    name: '管理用户',
    action: '/users',
    roles: 'UserManager',
  },
];

const userDropdownMenuItems: DropdownMenuItem[] = [
  {
    name: '个人信息',
    action: '/profile',
  },
  {
    name: '谁能看到我的数据',
    action: '/who-can-see-my-data',
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

interface SidebarProps extends BoxProps {
  onClose: () => void;
}

const Sidebar = ({ onClose, ...rest }: SidebarProps) => {
  const [me] = useUserContext();
  const userName = formatUserName(me.name);
  // Save an API call if the user is not a mentor.
  const { data: mentorships } = isPermitted(me.roles, "Mentor") ?
    trpcNext.mentorships.listMineAsMentor.useQuery() : { data: undefined };
  const mentorshipItems = mentorships2Items(mentorships);
  const backgroundColor = useColorModeValue(bgColorModeValues[0], 
    bgColorModeValues[1]);
  const borderColor = useColorModeValue(borderColorModeValues[0], 
    borderColorModeValues[1]); 

  return (
    <Box
      transition="3s ease"
      bg={backgroundColor}
      borderRight="1px"
      borderRightColor={borderColor}
      w={{ base: "full", [sidebarBreakpoint]: sidebarWidth }}
      pos="fixed"
      h="full"
      // Setting pos to fixed creates a new stacking context,
      // which might cause the element to render beneath others (dropdown) menu.
      // Solved it by setting a lower ZIndex to it.
      zIndex="1"
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
            marginX={sidebarItemPaddingLeft}
            marginTop={sidebarPaddingTop}
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
         <DropdownMenu
           title="管理功能"
           icon={<Icon as={MdPerson2} marginRight="2" />}
           menuItems={managerDropdownMenuItems}
           onClose={onClose}
         />
          {mentorshipItems?.length > 0 && <Divider marginY={2} />}
          {mentorshipItems.map(item => <SidebarRow key={item.path} item={item}
            onClose={onClose} />)}
        </Box>
        <Box>
          <DropdownMenu 
            title={userName} 
            icon={<Avatar size={'sm'} bg="brand.a" color="white" name={userName} 
              />}
            menuItems={userDropdownMenuItems}
            onClose={onClose}
          />
        </Box>
      </Flex>
    </Box >
  );
};

export default Sidebar;

function DropdownMenu({ title, icon, menuItems, onClose } : {
  title: string,
  icon: React.ReactNode,
  menuItems: DropdownMenuItem[],
} & SidebarProps) {
  const [user] = useUserContext();
  const backgroundColor = useColorModeValue(bgColorModeValues[0], 
    bgColorModeValues[1]);
  const borderColor = useColorModeValue(borderColorModeValues[0], 
    borderColorModeValues[1]);
  const filteredItems = menuItems.filter(item => 
    isPermitted(user.roles, item.roles));
  
  if (filteredItems.length === 0) {
    return <></>;
  }
  return <Flex paddingY={sidebarItemPaddingY}>
    <Menu placement='right-start'>
    <DropdownMenuButton title={title} icon={icon}/>
    <MenuList bg={backgroundColor} borderColor={borderColor}>
      {filteredItems.map((item, index) => {
        const isUrl = typeof item.action === 'string';
        return (
          <MenuItem 
            key={index} 
            // Only sets the link it is a url 
            {...isUrl && { as: NextLink,  href: item.action } }
            onClick={() => {
              // (item as { action: Function }).action() 
              // the above code will cause run time error if action is a URL.
              if (typeof item.action === 'function') item.action();
              onClose();
            }}>
            {item.icon}{item.name}
          </MenuItem>); 
      })}
    </MenuList>
  </Menu>
  </Flex>;
}

const DropdownMenuButton = ({ title, icon } : { 
  title: string,
  icon: React.ReactNode,
}) => {
  return <MenuButton marginX={componentSpacing}  paddingLeft={componentSpacing}
    color={siderbarTextColor} fontWeight="bold" transition="all 0.3s" 
    _focus={{ boxShadow: 'none' }}>
    <HStack>{icon}<Text>{title}</Text><FiChevronRight /></HStack>
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
      color={active ? "brand.c" : siderbarTextColor}
      fontWeight="bold"
      onClick={onClose}
    >
      <Flex
        align="center"
        paddingLeft={sidebarItemPaddingLeft}
        paddingY={sidebarItemPaddingY}
        role="group"
        cursor={active ? "default" : "pointer"}
        {...rest}
      >
        <Icon as={item.icon} />
        <Text marginX={componentSpacing}>{item.name}</Text>
        <Icon
          as={MdChevronRight}
          opacity={0}
          _groupHover={active ? {} : { opacity: 100 }}
        />
      </Flex>
    </Link>
  );
};
