import { Box, Button } from '@chakra-ui/react';
import Footer, { footerBreakpoint, footerMarginTop } from 'components/Footer';
import { PropsWithChildren, useEffect, useState } from 'react';

import UserContext from "./UserContext";
import trpc, { trpcNext } from "./trpc";
import User from './shared/User';
import NavBars, { sidebarBreakpoint, sidebarContentMarginTop, topbarHeight } from 'components/Navbars';
import { useSession, signIn, signOut } from "next-auth/react";
import Loader from 'components/Loader';
import invariant from "tiny-invariant";

type AppLayoutProps = {
  unlimitedPageWidth?: boolean,
} & PropsWithChildren;

export default function AppLayout(props: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null);

  // TODO: combine what userSession().data returns and our own User object.
  const { status } = useSession();

  // TODO: simplify the logic between useSession and setUser
  useEffect(() => {
    const fetchUser = async () => setUser(await trpc.users.me.query());
    if (status == "authenticated") fetchUser();
  }, [status]);

  if (status == "loading") {
    return <Loader />;
  } else if (status == "unauthenticated") {
    return <Button onClick={() => signIn('sendgrid', { email: 'user@company.com' })}>Sign In</Button>;
  } else {
    invariant(status == "authenticated");
    if (!user) {
      return <Loader />;
    } else {
      return <UserContext.Provider value={[user, setUser]}>
        <AppContent {...props} />
      </UserContext.Provider>;
    }
  }
}

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
