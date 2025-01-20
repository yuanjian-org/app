/**
 * Template from: https://chakra-templates.dev/navigation/sidebar
 */
import { ReactNode, useCallback, useRef, useState } from 'react';
import {
  IconButton,
  Box, useDisclosure
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
import RedDot from './RedDot';
import { useUnreadKudos } from './Kudos';
import { useUnreadChatMessages } from './ChatRoom';
import useMobile from 'useMobile';
import { useUnreadTasks } from './launchpad/TasksCard';

export const mobileSidbarIconTop = 4;
export const mobileSidbarIconLeftWithMargin = "70px";

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

  const mobile = useMobile();

  return (
    <Box minH="100vh" bg={colors.backgroundLight}>

      {mobile ? <>
        <SidebarForMobile isOpen={isOpen} onClose={onClose} />
        <AutosaveIndicatorForMobile autosaveState={autosaveState} />
        <SidebarIconForMobile onOpen={onOpen} />
      </> : <>
        <SidebarForDesktop />
        <AutosaveIndicatorForDesktop autosaveState={autosaveState} />
      </>}

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

function SidebarIconForMobile({ onOpen }: {
  onOpen: () => void,
}) {
  return <>
    <IconButton
      position="fixed"
      zIndex={2}
      top={mobileSidbarIconTop}
      right={4}

      onClick={onOpen}
      variant="outline"
      aria-label="open menu"
      icon={<FiMenu />}
      bg="white"
      shadow="sm"
    />
    <SidbarIconRedDot />
  </>;
}

function SidbarIconRedDot() {
  const hasUnreadKudos = useUnreadKudos();
  const hasUnreadTasks = useUnreadTasks();

  const mentorships = useMyMentorshipsAsMentor();
  const hasUnreadChatMessages = useUnreadChatMessages(
    mentorships?.filter(m => showRedDotForMentorship(m))
      .map(m => m.mentee.id) ?? []
  );

  return <RedDot
    position="fixed"
    zIndex={3}
    top="22px"
    right="20px"
    show={hasUnreadKudos || hasUnreadChatMessages || hasUnreadTasks}
  />;
}

function AutosaveIndicatorForMobile({ autosaveState }: {
  autosaveState: AutosaveState,
}) {
  return <Box
    position="fixed"
    zIndex={2}
    top={mobileSidbarIconTop + 2}
    right={mobileSidbarIconLeftWithMargin}
  >
    <AutosaveIndicator
      state={autosaveState}
      // For debugging only
      // state={{ id2state: new Map([["a", "无法保存"]]), virgin: false }}
    />
  </Box>;
}

function AutosaveIndicatorForDesktop({ autosaveState }: {
  autosaveState: AutosaveState,
}) {
  return <Box
    position="fixed"
    zIndex={2}
    top={1}
    left={10}
  >
    <AutosaveIndicator
      state={autosaveState}
      // For debugging only
      // state={{ id2state: new Map([["a", "无法保存"]]), virgin: false }}
    />
  </Box>;
}
