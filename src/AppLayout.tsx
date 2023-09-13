import { Box, Flex } from '@chakra-ui/react';
import Footer, { footerBreakpoint, footerMarginTop } from 'components/Footer';
import { PropsWithChildren, useEffect, useState } from 'react';

import UserContext from "./UserContext";
import trpc from "./trpc";
import User from './shared/User';
import NavBars, { sidebarBreakpoint, sidebarContentMarginTop, topbarHeight } from 'components/Navbars';
import { useSession } from "next-auth/react";
import invariant from "tiny-invariant";
import { useRouter } from 'next/router';
import Loader from 'components/Loader';

type AppLayoutProps = {
  unlimitedPageWidth?: boolean,
} & PropsWithChildren;

// TODO: Merge AppLayout into _app.tsx
export default function AppLayout(props: AppLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  // TODO: combine what userSession().data returns and our own User object.
  const { status } = useSession();

  // TODO: simplify the logic between useSession and setUser
  useEffect(() => {
    const fetchUser = async () => setUser(await trpc.users.me.query());
    if (status == "authenticated") fetchUser();
  }, [status]);

  if (status == "loading") {
    return <Loading />;
  } else if (status == "unauthenticated") {
    router.push(`/auth/login?callbackUrl=${encodeURIComponent(router.asPath)}`);
    return null;
  } else {
    invariant(status == "authenticated");
    if (!user) {
      return <Loading />;
    } else {
      return <UserContext.Provider value={[user, setUser]}>
        <AppContent {...props} />
      </UserContext.Provider>;
    }
  }
}

function Loading() {
  return <Flex justifyContent="center" alignItems="center" minHeight="100vh" color="gray">
    <Loader />
  </Flex>;
}

function AppContent(props: AppLayoutProps) {
  return <NavBars>
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
  </NavBars>;
}
