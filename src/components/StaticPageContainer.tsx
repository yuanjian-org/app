import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/StaticNavBar";
import { ReactNode } from "react";
import DemoBanner from "./DemoBanner";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";

export default function StaticPageContainer({
  children,
  isDemo,
}: {
  children: ReactNode;
  isDemo?: boolean;
}) {
  return (
    <VStack minHeight="100vh" spacing={0}>
      <DemoBanner isDemo={isDemo} />
      <StaticNavBar />
      <Box
        maxWidth={staticPageMaxWidth}
        paddingX={pageMarginX}
        w="100%"
        mt="70px"
      >
        {children}
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
