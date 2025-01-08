import { Spacer, VStack } from '@chakra-ui/react';
import Footer from 'components/Footer';
import { PropsWithChildren } from 'react';

import NavBars from 'components/Navbars';
import { breakpoint, pageMarginTop } from 'theme/metrics';
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
          minH="100vh"
          align="stretch"
          px={pageMarginX}
          pt={pageMarginTop}
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
