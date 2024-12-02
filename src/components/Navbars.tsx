/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import {
  IconButton,
  Box,
  Flex,
  HStack,
  useColorModeValue,
  Drawer,
  DrawerContent,
  useDisclosure,
  FlexProps
} from '@chakra-ui/react';
import {
  FiMenu,
} from 'react-icons/fi';
import NextLink from 'next/link';
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
import { breakpoint } from 'theme/metrics';

export const sidebarWidth = 60;

/**
 * The container for navbar, sidebar and page content that is passed in as `children`.
 */
export default function Navbars({
  children,
}: {
  children: ReactNode;
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [autosaveState, setAutosateState] = useState<AutosaveState>(initialState);

  /**
   * Use a reference holder to keep the values of addPS and removePS independent
   * of autosaveState, and thus avoid re-rendering the whole page every time
   * autosaveState changes.
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
    <Box minHeight="100vh" bg={useColorModeValue(colors.backgroundLight,
      colors.backgroundDark)}
    >
      {/* The sidebar on desktop */}
      <Sidebar
        onClose={() => onClose}
        display={{ base: 'none', [breakpoint]: 'block' }}
      />

      {/* The sidebar on mobile */}
      <Drawer
        autoFocus={false}
        isOpen={isOpen}
        placement="left"
        onClose={onClose}
        returnFocusOnClose={false}
        onOverlayClick={onClose}
        size="xs"
      >
        <DrawerContent>
          <Sidebar onClose={onClose} />
        </DrawerContent>
      </Drawer>

      <Topbar onOpen={onOpen} autosaveState={autosaveState} />

      <Box marginLeft={{ base: 0, [breakpoint]: sidebarWidth }}>
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

const Topbar = ({ onOpen, autosaveState }: TopbarProps) => {
  return (
    <Flex justifyContent="flex-end">
      <HStack spacing={6} marginTop={{ base: 0, [breakpoint]: 10 }} >
        <IconButton
          zIndex={2}
          marginX={4}
          marginTop={4}
          marginBottom={-8}
          display={{ base: 'flex', [breakpoint]: 'none' }}
          onClick={onOpen}
          variant="outline"
          aria-label="open menu"
          icon={<FiMenu />}
          bg="white"
        />
        <AutosaveIndicator
          display="flex"
          mt={{ base: "80px", [breakpoint]: 0 }}
          state={autosaveState}
        />
      </HStack>

      <Box display="flex">
        <NextLink href="http://yuanjian.org" target="_blank">
        </NextLink>
      </Box>
    </Flex>
  );
};
