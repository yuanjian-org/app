import { Box } from '@chakra-ui/react';
import Footer, { footerBreakpoint, footerMarginTop } from 'components/Footer';
import { PropsWithChildren, useEffect, useState } from 'react';

import UserContext from "../UserContext";
import User from '../shared/User';
import NavBars, { sidebarBreakpoint, sidebarContentMarginTop, topbarHeight } from 'components/Navbars';
import PageLoader from 'components/PageLoader';
import { Session } from 'next-auth';

export default function AppPageContainer({ children, wide, session, ...rest }: {
  wide: boolean,
  session: Session
} & PropsWithChildren) {
  const [user, setUser] = useState<User>(session.user);
  
  return <UserContext.Provider value={[user, setUser]}>
    <NavBars {...rest}>
      <Box
        marginTop={sidebarContentMarginTop}
        paddingX={{
          base: "16px",
          [sidebarBreakpoint]: "30px"
        }}
        maxWidth={{
          base: "100%",
          ...!wide && { xl: "1200px" }
        }}
        // TODO: these hard-coded numbers are empirically measured footer heights. Replace them with constants.
        minHeight={{
          base: `calc(100vh - ${topbarHeight} - (140px + ${footerMarginTop}))`,
          [footerBreakpoint]: `calc(100vh - ${topbarHeight} - (95px + ${footerMarginTop}))`,
        }}
      >
        {children}
      </Box>
      <Footer />
    </NavBars>
  </UserContext.Provider>;
}
