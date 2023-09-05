/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import {
  IconButton,
  Avatar,
  Box,
  Flex,
  HStack,
  useColorModeValue,
  Drawer,
  DrawerContent,
  Text,
  useDisclosure,
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
import { useUserContext } from 'UserContext';
import yuanjianLogo80x80 from '../../public/img/yuanjian-logo-80x80.png';
import Image from "next/image";
import colors from 'theme/colors';
import AutosaveIndicator, { 
  AutosaveState,
  addPendingSaver,
  initialState,
  removePendingSaver,
  setPendingSaverError
} from './AutosaveIndicator';
import AutosaveContext from 'AutosaveContext';
import Sidebar from './Sidebar';
import { formatUserName } from 'shared/strings';

export const sidebarWidth = 60;
export const topbarHeight = "60px";
export const sidebarBreakpoint = "lg";
export const sidebarContentMarginTop = 10;

/**
 * The container for navbar, sidebar and page content that is passed in as `children`.
 */
export default function Navbars({
  children,
}: {
  children: ReactNode;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [ autosaveState, setAutosateState] = useState<AutosaveState>(initialState);

  /**
   * Use a reference holder to keep the values of addPS and removePS independent of autosaveState, and thus avoid
   * re-rendering the whole page every time autosaveState changes.
   */
  const stateRef = useRef(initialState);
  const addPS = useCallback((id: string) => {
    stateRef.current = addPendingSaver(stateRef.current, id);
    setAutosateState(stateRef.current);
  }, [stateRef]);
  const removePS = useCallback((id: string) => {
    stateRef.current = removePendingSaver(stateRef.current, id);
    setAutosateState(stateRef.current);
  }, [stateRef]);
  const setPSError = useCallback((id: string, e?: any) => {
    stateRef.current = setPendingSaverError(stateRef.current, id, e);
    setAutosateState(stateRef.current);
  }, [stateRef]);
  
  return (
    <Box minHeight="100vh" bg={useColorModeValue(colors.backgroundLight, colors.backgroundDark)}>
      <Sidebar
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
          <Sidebar onClose={onClose} />
        </DrawerContent>
      </Drawer>
      <Topbar onOpen={onOpen} autosaveState={autosaveState} />
      <Box marginLeft={{ base: 0, [sidebarBreakpoint]: sidebarWidth }}>
        <AutosaveContext.Provider value={{
          addPendingSaver: addPS,
          removePendingSaver: removePS,
          setPendingSaverError: setPSError,
        }}>
          {children}
        </AutosaveContext.Provider>
      </Box>
    </Box>
  );
}

interface TopbarProps extends FlexProps {
  onOpen: () => void,
  autosaveState: AutosaveState,
}

const Topbar = ({ onOpen, autosaveState, ...rest }: TopbarProps) => {
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
      justifyContent={{ base: 'space-between' }}
      {...rest}
    >
      <HStack spacing={6}>
        <IconButton
          display={{ base: 'flex', [sidebarBreakpoint]: 'none' }}
          onClick={onOpen}
          variant="outline"
          aria-label="open menu"
          icon={<FiMenu />}
        />
        <AutosaveIndicator
          // TODO: Implement on mobile UI
          display={{ base: 'none', [sidebarBreakpoint]: 'flex' }}
          state={autosaveState} 
        />
      </HStack>

      <Box display={{ base: 'flex', [sidebarBreakpoint]: 'none' }}>
        <NextLink href="http://yuanjian.org" target="_blank">
          <Image src={yuanjianLogo80x80} alt="远见教育基金会" width={40} />
        </NextLink>
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
                  name={formatUserName(user.name, "formal")}
                />
                <Text 
                  display={{ base: 'none', [sidebarBreakpoint]: 'flex' }}
                  marginLeft="2"
                  fontSize="sm"
                >
                  {formatUserName(user.name, "formal")}
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
};
