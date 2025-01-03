import { Spacer, VStack } from '@chakra-ui/react';
import Footer from 'components/Footer';
import { PropsWithChildren } from 'react';

import NavBars from 'components/Navbars';
import { breakpoint } from 'theme/metrics';
import { AppPageType } from 'AppPage';
import { pageMarginX } from 'theme/metrics';
import PostLoginModels from './PostLoginModels';

export default function AppPageContainer({ pageType, children }: {
  pageType?: AppPageType,
} & PropsWithChildren) {
  return <>
    <NavBars>
      {pageType === "full" ?
        children
        :
        <VStack
          // 40px is the height of the Topbar in navbars.tsx. TODO: remove it
          minHeight="calc(100vh  - 40px)"
          align="stretch"
          paddingX={pageMarginX}
          maxWidth={{
            base: "100%",
            ...pageType !== "wide" && { xl: "1200px" }
          }}
        >
          {children}
        <Spacer />
        <Footer alignItems={{ base: 'center', [breakpoint]: 'start' }} />
      </VStack>
      }
    </NavBars>

    <PostLoginModels />
  </>;
}
