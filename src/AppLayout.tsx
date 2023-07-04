// Chakra imports
import { Portal, Box, useDisclosure } from '@chakra-ui/react'
import Footer, { bodyFooterSpacing } from 'components/Footer'
// Layout components
import Navbar from 'horizon-ui/components/navbar/NavbarAdmin'
import Sidebar from 'horizon-ui/components/sidebar/Sidebar'
import { SidebarContext } from 'horizon-ui/contexts/SidebarContext'
import { FC, PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react'
import {
  getActiveSidebar,
  getActiveSidebarText,
  getActiveRoute,
  sidebarItems,
} from 'sidebar'

// Code example: https://github.com/Authing/Guard/tree/dev-v6/examples/guard-nextjs-react18
import { GuardProvider } from '@authing/guard-react18';
import { UserContext } from "./useUserContext";
import browserEnv from "./browserEnv";
import trpc from "./trpc";
import { BeatLoader } from 'react-spinners';
import guard from './guard';
import UserProfile from './shared/UserProfile'

interface AppLayoutProps extends PropsWithChildren {
  [x: string]: any
}

export default function AppLayout(props: AppLayoutProps) {
  useEffect(() => {
    window.document.documentElement.dir = 'ltr'
  });

  return (
    <GuardProvider appId={browserEnv.NEXT_PUBLIC_AUTHING_APP_ID}
      redirectUri={typeof window !== 'undefined' ? (location.origin + '/callback') : ''}
    >
      <Guarded>{() => <AppContent {...props} />}</Guarded>
    </GuardProvider>
  )
}

const Guarded: FC<{ children: (_: UserProfile) => ReactNode }> = (props) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const userFetchedRef = useRef(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (await guard.trackSession()) {
        // For some reason ts cries when `as UserProfile` is absent
        setUser(await trpc.me.profile.query() as UserProfile);
      } else {
        location.href = '/login';
      }
    };

    // Avoid React calling fetchUser() twice which is expensive.
    // Reference: https://upmostly.com/tutorials/why-is-my-useeffect-hook-running-twice-in-react
    if (userFetchedRef.current) return;
    userFetchedRef.current = true;
    fetchUser();
  }, []);

  if (!user) {
    // Redirecting...
    return <BeatLoader
      color="rgba(54, 89, 214, 1)"
      cssOverride={{
        display: "flex",
        alignContent: "center",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  }
  return <UserContext.Provider value={[user, setUser]}>
    {props.children(user)}
  </UserContext.Provider>
};

function AppContent(props: AppLayoutProps) {
  const { children, ...rest } = props;
  const [fixed] = useState(false);
  const [toggleSidebar, setToggleSidebar] = useState(false);
  // functions for changing the states from components
  const { onOpen } = useDisclosure();

  return <Box>
    <SidebarContext.Provider
      value={{
        toggleSidebar,
        setToggleSidebar
      }}
    >
      <Sidebar routes={sidebarItems} display='none' {...rest} />
      <Box
        float='right'
        minHeight='100vh'
        height='100%'
        overflow='auto'
        position='relative'
        maxHeight='100%'
        w={{ base: '100%', xl: 'calc( 100% - 290px )' }}
        maxWidth={{ base: '100%', xl: 'calc( 100% - 290px )' }}
        transition='all 0.33s cubic-bezier(0.685, 0.0473, 0.346, 1)'
        transitionDuration='.2s, .2s, .35s'
        transitionProperty='top, bottom, width'
        transitionTimingFunction='linear, linear, ease'
      >
        <Portal>
          <Box>
            <Navbar
              onOpen={onOpen}
              logoText={'Horizon UI Dashboard PRO'}
              brandText={getActiveRoute(sidebarItems)}
              secondary={getActiveSidebar(sidebarItems)}
              message={getActiveSidebarText(sidebarItems)}
              fixed={fixed}
              {...rest}
            />
          </Box>
        </Portal>
        <Box
          marginX='auto'
          padding={{ base: '20px', md: '30px' }}
          paddingEnd='20px'
          minHeight={{ 
            base: `calc( 100vh - 100px - ${bodyFooterSpacing}px )`, 
            xl: `calc( 100vh - 55px - ${bodyFooterSpacing}px )`,
          }}
          paddingTop='50px'
        >
          {children}
        </Box>
        <Box>
          <Footer />
        </Box>
      </Box>
    </SidebarContext.Provider>
  </Box>;
}