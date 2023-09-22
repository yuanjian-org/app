import { Box } from '@chakra-ui/react';
import Footer, { footerBreakpoint, footerMarginTop } from 'components/Footer';
import { PropsWithChildren, useState } from 'react';

import UserContext from "../UserContext";
import User from '../shared/User';
import NavBars, { sidebarBreakpoint, sidebarContentMarginTop, topbarHeight } from 'components/Navbars';

export default function AppPageContainer({ wide, user, children, ...rest }: {
  wide: boolean,
  user: User,
} & PropsWithChildren) {
  const [u, setUser] = useState<User>(user);

  return <UserContext.Provider value={[u, setUser]}>
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
