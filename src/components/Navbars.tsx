/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import { ReactNode, useCallback, useRef, useState } from 'react';
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
import { ShowOnDesktop, ShowOnMobile } from './Show';
import RedDot from './RedDot';
import { showUnreadKudosRedDot } from './Kudos';
import { trpcNext } from 'trpc';

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
      {/* Desktop sidebar */}
      <ShowOnDesktop>
        <Sidebar onClose={() => onClose} />
      </ShowOnDesktop>

      {/* Mobile sidebar */}
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

        {/* Mobile menu icon */}
        <ShowOnMobile>
          <Box position="relative">
            <IconButton
              zIndex={2}
              marginX={4}
              marginTop={4}
              marginBottom={-8}
              onClick={onOpen}
              variant="outline"
              aria-label="open menu"
              icon={<FiMenu />}
              bg="white"
              position="relative"
            />
            <MobileMenuIconRedDot />
          </Box>
        </ShowOnMobile>

        <AutosaveIndicator
          display="flex"
          mt={{ base: "80px", [breakpoint]: 0 }}
          state={autosaveState}
        />
      </HStack>
    </Flex>
  );
};

function MobileMenuIconRedDot() {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const { data: newest } = trpcNext.kudos.getNewestKudosCreatedAt.useQuery();
  const show = showUnreadKudosRedDot(state, newest);
  return <RedDot show={show} top={6} right="22px" zIndex={3} />;
}
