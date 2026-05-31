import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/StaticNavBar";
import { ReactNode } from "react";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import useStaticGlobalConfigs from "./useStaticGlobalConfigs";
import UstcLandingPage from "./UstcLandingPage";
import XhefLandingPage from "./XhefLandingPage";
import DemoLandingPage from "./DemoLandingPage";
import PageLoader from "./PageLoader";

export default function StaticPageContainer({
  children,
}: {
  children: ReactNode;
}) {
  const { data } = useStaticGlobalConfigs();

  if (!data) {
    return <PageLoader />;
  }

  if (data?.whiteLabel === "ustc") {
    return <UstcLandingPage />;
  }

  if (data?.whiteLabel === "xhef") {
    return <XhefLandingPage />;
  }

  if (data?.whiteLabel === "demo") {
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
