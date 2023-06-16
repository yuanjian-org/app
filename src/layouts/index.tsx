// Chakra imports
import { Portal, Box, useDisclosure } from '@chakra-ui/react'
import Footer from 'horizon-ui/components/footer/FooterAdmin'
// Layout components
import Navbar from 'horizon-ui/components/navbar/NavbarAdmin'
import Sidebar from 'horizon-ui/components/sidebar/Sidebar'
import { SidebarContext } from 'horizon-ui/contexts/SidebarContext'
import { FC, PropsWithChildren, ReactNode, useEffect, useMemo, useState } from 'react'
import routes from 'routes'
import {
  getActiveNavbar,
  getActiveNavbarText,
  getActiveRoute,
} from 'navigation'

// React 16/17
// 代码示例：https://github.com/Authing/Guard/blob/master/examples/guard-react/normal/src/pages/Callback.tsx
// import { JwtTokenStatus, useGuard, User } from '@authing/guard-react';

// React 18
// 代码示例：https://github.com/Authing/Guard/blob/master/examples/guard-react18/normal/src/pages/Callback.tsx
import { GuardProvider, User, Guard } from '@authing/guard-react18';
import { UserPropContext } from "../useUserInfo";
import browserEnv from "../browserEnv";
import tClientBrowser from "../tClientBrowser";
import { IYuanjianUser } from "../shared/user";
import { useRouter } from "next/router";
import { isPermitted } from "../shared/RBAC";
import { BeatLoader } from 'react-spinners'

interface DashboardLayoutProps extends PropsWithChildren {
  [x: string]: any
}

const Guarded: FC<{ children: (userInfo: IYuanjianUser) => ReactNode }> = (props) => {
  const guard = new Guard({
    appId: browserEnv.NEXT_PUBLIC_AUTHING_APP_ID,
    redirectUri:
      typeof window !== 'undefined' ? (location.origin + '/callback') : '',
  });

  const [userInfo, setUserInfo] = useState<IYuanjianUser | null>(null);
  // user context in child components will be passed back and updated here
  const updateUser = (IYuanjianUser: IYuanjianUser) => { setUserInfo(IYuanjianUser) };

  useEffect(() => {
    guard.trackSession().then((res: User | null) => {
      //console.log('res', res);
      if (!res) {
        location.href = '/login'
      }
    }).then(

      () => tClientBrowser.user.onEnterApp.mutate({}).then(res => {
        if (res === "ok") {
          return tClientBrowser.user.profile.query({}).then((user) => {
            setUserInfo(user);
          })
        } else {
          return;
        }
      }));
  }, [])

  if (!userInfo) {
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
  return <UserPropContext.Provider value={{ user: userInfo, updateUser }}>
    {props.children(userInfo)}
  </UserPropContext.Provider>
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
    // console.log('router', router);
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
