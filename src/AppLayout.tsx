import { Box } from '@chakra-ui/react';
import Footer, { footerBreakpoint, footerMarginTop } from 'components/Footer';
import { PropsWithChildren, useEffect, useState } from 'react';

import UserContext from "./UserContext";
import trpc from "./trpc";
import User from './shared/User';
import NavBars, { sidebarBreakpoint, sidebarContentMarginTop, topbarHeight } from 'components/Navbars';
import PageLoader from 'components/PageLoader';

type AppLayoutProps = {
  unlimitedPageWidth?: boolean,
} & PropsWithChildren;

// TODO: Merge AppLayout into _app.tsx
export default function AppLayout(props: AppLayoutProps) {
  const [user, setUser] = useState<User | null>(null);

  // TODO: extend userSession().data to include other user fields, and remove this extra call to users.me
  useEffect(() => {
    const f = async () => setUser(await trpc.users.me.query());
    f();
  }, []);

  return !user ?
    <PageLoader /> 
    : 
    <UserContext.Provider value={[user, setUser]}>
      <AppContent {...props} />
    </UserContext.Provider>;
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
