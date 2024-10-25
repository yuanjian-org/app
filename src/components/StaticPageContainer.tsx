import { Box, Spacer, VStack } from '@chakra-ui/react';
import Footer from 'components/Footer';
import StaticNavBar from 'components/StaticNavBar';
import { ReactNode } from 'react';
import { pageMarginX, staticPageMaxWidth } from 'theme/metrics';

export default function StaticPageContainer({ children }: {
  children: ReactNode
}) {
  return <VStack minHeight="100vh">
    <StaticNavBar />
    <Box
      maxWidth={staticPageMaxWidth}
      paddingX={pageMarginX}
      w="100%"
      mt="20px"
    >
      {children}
    </Box>
    <Spacer />
    <Footer />
  </VStack>;
}
