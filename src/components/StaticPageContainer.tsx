import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/StaticNavBar";
import { ReactNode } from "react";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import { useIsStaticConfigsReady, useWhiteLabel } from "./useStaticConfigs";
import UstcLandingPage from "./UstcLandingPage";
import XhefLandingPage from "./XhefLandingPage";
import DemoLandingPage from "./DemoLandingPage";
import PageLoader from "./PageLoader";

export default function StaticPageContainer({
  children,
}: {
  children: ReactNode;
}) {
  const whiteLabel = useWhiteLabel();

  if (!useIsStaticConfigsReady()) {
    return <PageLoader />;
  }

  if (whiteLabel === "ustc") {
    return <UstcLandingPage />;
  }

  if (whiteLabel === "xhef") {
    return <XhefLandingPage />;
  }

  if (whiteLabel === "demo") {
    return <DemoLandingPage />;
  }

  return (
    <VStack minHeight="100vh">
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
