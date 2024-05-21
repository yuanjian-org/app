import { Box } from '@chakra-ui/react';
import Footer, { footerBreakpoint, footerMarginTop } from 'components/Footer';
import { PropsWithChildren, useState } from 'react';

import UserContext from "../UserContext";
import User from '../shared/User';
import NavBars, { sidebarBreakpoint, sidebarContentMarginTop, topbarHeight } from 'components/Navbars';
import { AppPageType } from 'AppPage';

export default function AppPageContainer({ pageType, user, children, ...rest }: {
  pageType: AppPageType,
  user: User,
} & PropsWithChildren) {
  const [u, setUser] = useState<User>(user);

  return <UserContext.Provider value={[u, setUser]}>
    <NavBars {...rest}>
      {pageType === "full" ? children : <>
        <Box
          marginTop={sidebarContentMarginTop}
          paddingX={{
            base: "16px",
            [sidebarBreakpoint]: "30px"
          }}
          maxWidth={{
            base: "100%",
            ...pageType !== "wide" && { xl: "1200px" }
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
      </>}
    </NavBars>
  </UserContext.Provider>;
}
