import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/StaticNavBar";
import { ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  pageMarginX,
  staticPageMaxWidth,
  staticPageMaxWidthWide,
} from "theme/metrics";
import { AppPageType } from "../AppPage";
import { useFeatures, useIsStaticConfigsReady } from "./useStaticConfigs";
const UstcLandingPage = dynamic(() => import("./UstcLandingPage"));
const XhefLandingPage = dynamic(() => import("./XhefLandingPage"));
const DemoLandingPage = dynamic(() => import("./DemoLandingPage"));
const YqdLandingPage = dynamic(() => import("./YqdLandingPage"));
const SylpLandingPage = dynamic(() => import("./SylpLandingPage"));
import PageLoader from "./PageLoader";

const whiteLabel = process.env.NEXT_PUBLIC_WHITE_LABEL || "yuantu";

export default function StaticPageContainer({
  pageType,
  children,
}: {
  children: ReactNode;
  pageType?: AppPageType;
}) {
  const features = useFeatures();

  if (!useIsStaticConfigsReady()) {
    return <PageLoader />;
  }

  if (features.projects) {
    return (
      <DefaultStaticPageContaner pageType={pageType}>
        {children}
      </DefaultStaticPageContaner>
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

  if (whiteLabel === "yqd") {
    return <YqdLandingPage />;
  }

  if (whiteLabel === "sylp") {
    return <SylpLandingPage />;
  }

  return (
    <DefaultStaticPageContaner pageType={pageType}>
      {children}
    </DefaultStaticPageContaner>
  );
}

function DefaultStaticPageContaner({
  children,
  pageType,
}: {
  children: ReactNode;
  pageType?: AppPageType;
}) {
  return (
    <VStack minHeight="100vh">
      <StaticNavBar pageType={pageType} />
      <Box
        maxWidth={
          pageType === "wide" ? staticPageMaxWidthWide : staticPageMaxWidth
        }
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
