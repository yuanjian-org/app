/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import { ReactNode, useCallback, useRef, useState } from 'react';
import {
  IconButton,
  Box, HStack, useDisclosure, Spacer
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
import {
  desktopSidebarWidth,
  showRedDotForMentorship, SidebarForDesktop,
  SidebarForMobile,
  useMyMentorshipsAsMentor
} from './Sidebar';
import { breakpoint } from 'theme/metrics';
import { ShowOnDesktop, ShowOnMobile } from './Show';
import RedDot from './RedDot';
import { useUnreadKudos } from './Kudos';
import { useUnreadChatMessages } from './ChatRoom';

export default function Navbars({ children }: {
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
    <Box minH="100vh" bg={colors.backgroundLight}>
      <ShowOnDesktop>
        <SidebarForDesktop />
      </ShowOnDesktop>

      <ShowOnMobile>
        <SidebarForMobile isOpen={isOpen} onClose={onClose} />
      </ShowOnMobile>

      <TopFixedComponents onOpen={onOpen} autosaveState={autosaveState} />

      <Box ml={{ base: 0, [breakpoint]: desktopSidebarWidth }}>
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

const TopFixedComponents = ({ onOpen, autosaveState }: {
  onOpen: () => void,
  autosaveState: AutosaveState,
}) => {
  return (
    <HStack
      position="fixed"
      zIndex={2}
      top="0"
      left="0"
      width="100%"
      ps={10}
      pe={4}
      pt={{ base: 4, [breakpoint]: 1 }}
    >
      <ShowOnMobile>
        <Spacer />
      </ShowOnMobile>

      <AutosaveIndicator
        state={autosaveState}
        // For debugging only
        // state={{ id2state: new Map([["a", "无法保存"]]), virgin: false }}
      />

      {/* Mobile menu icon */}
      <ShowOnMobile>
        <IconButton
          onClick={onOpen}
          variant="outline"
          aria-label="open menu"
          icon={<FiMenu />}
          bg="white"
          shadow="sm"
        />
        <MobileMenuIconRedDot />
      </ShowOnMobile>
    </HStack>
  );
};

function MobileMenuIconRedDot() {
  const hasUnreadKudos = useUnreadKudos();
  const mentorships = useMyMentorshipsAsMentor();
  const hasUnreadChatMessages = useUnreadChatMessages(
    mentorships?.filter(m => showRedDotForMentorship(m))
      .map(m => m.mentee.id) ?? []
  );

  return <RedDot
    show={hasUnreadKudos || hasUnreadChatMessages}
    top="22px"
    right="20px"
    position="fixed"
    zIndex={3}
  />;
}
