/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import React, { ReactNode } from 'react';
import {
  IconButton,
  Avatar,
  Box,
  CloseButton,
  Flex,
  HStack,
  Icon,
  useColorModeValue,
  Link,
  Drawer,
  DrawerContent,
  Text,
  useDisclosure,
  BoxProps,
  FlexProps,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
} from '@chakra-ui/react';
import {
  FiMenu,
  FiChevronDown,
} from 'react-icons/fi';
import { LockIcon } from '@chakra-ui/icons';
import NextLink from 'next/link';
import { Guard, useGuard } from "@authing/guard-react18";
import useUserContext from 'useUserContext';
import sidebarItems, { SidebarItem } from 'sidebarItems';
import { isPermitted } from 'shared/Role';
import yuanjianLogo224x97 from '../../public/img/yuanjian-logo-224x97.png';
import yuanjianLogo80x80 from '../../public/img/yuanjian-logo-80x80.png';

import Image from "next/image";
import { useRouter } from 'next/router';
import { MdChevronRight } from 'react-icons/md';

const sidebarWidth = 60;
export const topbarHeight = "60px";
export const sidebarBreakpoint = "lg";
export const sidebarContentMarginTop = "40px";

/**
 * The container for navbar, sidebar and page content that is passed in as `children`.
 */
export default function Navbars({
  children,
}: {
  children: ReactNode;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  return (
    <Box minHeight="100vh" bg={useColorModeValue('gray.100', 'gray.900')}>
      <SidebarContent
        onClose={() => onClose}
        display={{ base: 'none', [sidebarBreakpoint]: 'block' }}
      />
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="xs">
        <DrawerContent>
          <SidebarContent onClose={onClose} />
        </DrawerContent>
      </Drawer>
      <Topbar onOpen={onOpen} />
      <Box marginLeft={{ base: 0, [sidebarBreakpoint]: sidebarWidth }}>
        {children}
      </Box>
    </Box>
  );
}

interface SidebarProps extends BoxProps {
  onClose: () => void;
}
const SidebarContent = ({ onClose, ...rest }: SidebarProps) => {
  const [user] = useUserContext();

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
        height={topbarHeight}
        alignItems="center"
        marginX="8" 
        justifyContent="space-between"
      >
        <Box display={{ base: 'none', [sidebarBreakpoint]: 'flex' }}>
          <Image src={yuanjianLogo224x97} alt="远见教育基金会" width={112} />
        </Box>
        <CloseButton display={{ base: 'flex', [sidebarBreakpoint]: 'none' }} onClick={onClose} />
      </Flex>
      <Box height={{
        base: 4,
        [sidebarBreakpoint]: sidebarContentMarginTop,
        }}/>
      {sidebarItems
        .filter(item => isPermitted(user.roles, item.role))
        .map(item => (
        <SidebarRow key={item.path} item={item} onClose={onClose} />
      ))}
    </Box>
  );
};

interface SidebarRowProps extends SidebarProps {
  item: SidebarItem,
}
const SidebarRow = ({ item, onClose, ...rest }: SidebarRowProps) => {
  const { pathname } = useRouter();
  const active = pathname === item.path;
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
        paddingX={4}
        paddingBottom={8}
        marginX="4"
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

interface TopbarProps extends FlexProps {
  onOpen: () => void;
}

const Topbar = ({ onOpen, ...rest }: TopbarProps) => {
	const guard = useGuard();
	const [user] = useUserContext();

  return (
    <Flex
      // Fix it to screen top: https://www.w3schools.com/howto/howto_css_sticky_element.asp
      position="sticky"
      top={0}
      zIndex={200}

      marginLeft={{ base: 0, [sidebarBreakpoint]: sidebarWidth }}
      paddingX={4}
      height={topbarHeight}
      alignItems="center"
      bg={useColorModeValue('white', 'gray.900')}
      borderBottomWidth="1px"
      borderBottomColor={useColorModeValue('gray.200', 'gray.700')}
      justifyContent={{ base: 'space-between', [sidebarBreakpoint]: 'flex-end' }}
      {...rest}
    >
      <IconButton
        display={{ base: 'flex', [sidebarBreakpoint]: 'none' }}
        onClick={onOpen}
        variant="outline"
        aria-label="open menu"
        icon={<FiMenu />}
      />

      <Box display={{ base: 'flex', [sidebarBreakpoint]: 'none' }}>
        <Image src={yuanjianLogo80x80} alt="远见教育基金会" width={40} />
      </Box>

      <HStack spacing={{ base: '0', [sidebarBreakpoint]: '6' }}>
        {/* <IconButton
          size="lg"
          variant="ghost"
          aria-label="open menu"
          icon={<FiBell />}
        /> */}
        <Flex alignItems={'center'}>
          <Menu>
            <MenuButton
              py={2}
              transition="all 0.3s"
              _focus={{ boxShadow: 'none' }}>
              <HStack>
                <Avatar
                  size={'sm'}
                  bg="brand.a"
                  color="white"
                  name={user.name || ""}
                />
                <Text 
                  display={{ base: 'none', [sidebarBreakpoint]: 'flex' }}
                  marginLeft="2"
                  fontSize="sm"
                >
                  {user.name || ""}
                </Text>
                <Box display={{ base: 'none', [sidebarBreakpoint]: 'flex' }}>
                  <FiChevronDown />
                </Box>
              </HStack>
            </MenuButton>
            <MenuList
              bg={useColorModeValue('white', 'gray.900')}
              borderColor={useColorModeValue('gray.200', 'gray.700')}>
              <MenuItem as={NextLink} href='/profile'>
                个人信息
              </MenuItem>
              <MenuDivider />
              <MenuItem as={NextLink} href='/whocanseemydata'>
                <LockIcon marginRight={1} />谁能看到我的数据
              </MenuItem>
              <MenuDivider />
              <MenuItem
                onClick={async () => {
                  // Wait until this is fixed
                  // https://github.com/Authing/Guard/issues/179
                  await logout.call(guard);
                  location.href = '/';
                }}              
              >退出登录</MenuItem>
            </MenuList>
          </Menu>
        </Flex>
      </HStack>
    </Flex>
  );
};

const logout = async function (this: Guard) {
	const authClient = await this.getAuthClient();
	await authClient.logout();
	localStorage.clear();
}
