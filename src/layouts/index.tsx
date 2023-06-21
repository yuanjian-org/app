// Chakra imports
import { Portal, Box, useDisclosure } from '@chakra-ui/react'
import Footer from 'horizon-ui/components/footer/FooterAdmin'
// Layout components
import Navbar from 'horizon-ui/components/navbar/NavbarAdmin'
import Sidebar from 'horizon-ui/components/sidebar/Sidebar'
import { SidebarContext } from 'horizon-ui/contexts/SidebarContext'
import { FC, PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import routes from 'routes'
import {
  getActiveNavbar,
  getActiveNavbarText,
  getActiveRoute,
} from 'navigation'

// Code example: https://github.com/Authing/Guard/tree/dev-v6/examples/guard-nextjs-react18
import { GuardProvider, User, Guard } from '@authing/guard-react18';
import { UserContext } from "../useUserContext";
import browserEnv from "../browserEnv";
import tClientBrowser from "../tClientBrowser";
import { IUser } from "../shared/user";
import { useRouter } from "next/router";
import { isPermitted } from "../shared/RBAC";
import { BeatLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import guard from '../guard';

interface DashboardLayoutProps extends PropsWithChildren {
  [x: string]: any
}

const Guarded: FC<{ children: (userInfo: IUser) => ReactNode }> = (props) => {
  const [user, setUser] = useState<IUser | null>(null);
  const userFetchedRef = useRef(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (await guard.trackSession()) {
        setUser(await tClientBrowser.me.profile.query({}));
      } else {
        location.href = '/login';
      }
    };

    // Avoid React calling fetchUser() twice which is expensive with several calls to authing.cn and our server.
    // Reference: https://upmostly.com/tutorials/why-is-my-useeffect-hook-running-twice-in-react
    if (userFetchedRef.current) return;
    userFetchedRef.current = true;
    fetchUser().catch(toast.error);
  }, []);

  if (!user) {
    //'跳转中...' 
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

// Custom Chakra theme
export default function AppLayout(props: DashboardLayoutProps) {
  const { children, ...rest } = props
  // states and functions
  const [fixed] = useState(false)
  const [toggleSidebar, setToggleSidebar] = useState(false)
  // functions for changing the states from components
  const { onOpen } = useDisclosure()

  useEffect(() => {
    window.document.documentElement.dir = 'ltr'
  });

  const router = useRouter();

  const currentResource = useMemo(() => {
    const currentRoute = routes.find(r => r.path === router.pathname);

    if (!currentRoute) {
      return 'unknown';
    } else {
      return currentRoute.resource;
    }
  }, [router.pathname]);

  return (
    <GuardProvider appId={browserEnv.NEXT_PUBLIC_AUTHING_APP_ID}
      redirectUri={
        typeof window !== 'undefined' ? (location.origin + '/callback') : ''
      }
    >
      <Guarded>

        {(userInfo) => <Box>
          <SidebarContext.Provider
            value={{
              toggleSidebar,
              setToggleSidebar
            }}
          >
            <Sidebar routes={
              routes.filter(r => isPermitted(userInfo.roles, r.resource))
            } display='none' {...rest} />
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
                    brandText={getActiveRoute(routes)}
                    secondary={getActiveNavbar(routes)}
                    message={getActiveNavbarText(routes)}
                    fixed={fixed}
                    {...rest}
                  />
                </Box>
              </Portal>

              <Box
                mx='auto'
                p={{ base: '20px', md: '30px' }}
                pe='20px'
                minH='100vh'
                pt='50px'
              >
                {
                  (
                    !isPermitted(userInfo.roles, currentResource)) ?
                    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>Permission denied</Box> : children
                }
              </Box>
              <Box>
                <Footer />
              </Box>
            </Box>
          </SidebarContext.Provider>
        </Box>}
      </Guarded>
    </GuardProvider>
  )
}
