import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/StaticNavBar";
import { ReactNode } from "react";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import {
  useFeatures,
  useIsStaticConfigsReady,
  useWhiteLabel,
} from "./useStaticConfigs";
import UstcLandingPage from "./UstcLandingPage";
import XhefLandingPage from "./XhefLandingPage";
import DemoLandingPage from "./DemoLandingPage";
import PageLoader from "./PageLoader";

import { AppPageType } from "../AppPage";

export default function StaticPageContainer({
  children,
  pageType,
}: {
  children: ReactNode;
  pageType?: AppPageType;
}) {
  const whiteLabel = useWhiteLabel();
  const features = useFeatures();

  if (!useIsStaticConfigsReady()) {
    return <PageLoader />;
  }

  if (features.projects) {
    return (
      <DefaultPageContaner pageType={pageType}>{children}</DefaultPageContaner>
    );
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
    <DefaultPageContaner pageType={pageType}>{children}</DefaultPageContaner>
  );
}

function DefaultPageContaner({
  children,
  pageType,
}: {
  children: ReactNode;
  pageType?: AppPageType;
}) {
  return (
    <VStack minHeight="100vh">
      <StaticNavBar />
      <Box
        maxWidth={pageType === "wide" ? "1200px" : staticPageMaxWidth}
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
