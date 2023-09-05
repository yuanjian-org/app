import { Box } from '@chakra-ui/react';
import Footer, { footerBreakpoint, footerMarginTop } from 'components/Footer';
import { FC, PropsWithChildren, ReactNode, useEffect, useRef, useState } from 'react';

// Code example: https://github.com/Authing/Guard/tree/dev-v6/examples/guard-nextjs-react18
import { GuardProvider } from '@authing/guard-react18';
import UserContext from "./UserContext";
import browserEnv from "./browserEnv";
import trpc from "./trpc";
import { BeatLoader } from 'react-spinners';
import guard from './guard';
import User from './shared/User';
import NavBars, { sidebarBreakpoint, sidebarContentMarginTop, topbarHeight } from 'components/Navbars';

interface AppLayoutProps extends PropsWithChildren {
  unlimitedPageWidth?: boolean,
}
export default function AppLayout(props: AppLayoutProps) {
  useEffect(() => {
    // Left-to-right layout
    window.document.documentElement.dir = 'ltr';
  });

  return (
    <GuardProvider appId={browserEnv.NEXT_PUBLIC_AUTHING_APP_ID}
      redirectUri={typeof window !== 'undefined' ? (location.origin + '/callback') : ''}
    >
      <Guarded>{() => <AppContent {...props} />}</Guarded>
    </GuardProvider>
  );
}

const Guarded: FC<{ children: (_: User) => ReactNode }> = (props) => {
  const [user, setUser] = useState<User | null>(null);
  const userFetchedRef = useRef(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (await guard.trackSession()) {
        // For some reason ts cries when `as User` is absent
        setUser(await trpc.users.me.query() as User);
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
    />;
  }
  return <UserContext.Provider value={[user, setUser]}>
    {props.children(user)}
  </UserContext.Provider>;
};

function AppContent(props: AppLayoutProps) {
  return (
    <NavBars>
      <Box
        marginTop={sidebarContentMarginTop}
        paddingX={{ 
          base: "16px",
          [sidebarBreakpoint]: "30px" 
        }}
        maxWidth={{
          base: "100%",
          ...props.unlimitedPageWidth ? {} : { xl: "1200px" }
        }}
        // TODO: these hard-coded numbers are empirically measured footer heights. Replace them with constants.
        minHeight={{
          base: `calc(100vh - ${topbarHeight} - (140px + ${footerMarginTop}))`,
          [footerBreakpoint]: `calc(100vh - ${topbarHeight} - (95px + ${footerMarginTop}))`,
        }}      
      >
        {props.children}
      </Box>
      <Footer />
    </NavBars>
  );
}
