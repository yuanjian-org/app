import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/StaticNavBar";
import { ReactNode } from "react";
import {
  pageMarginX,
  staticPageMaxWidth,
  staticPageMaxWidthWide,
} from "theme/metrics";
import { AppPageType } from "../AppPage";
import { features } from "shared/Features";
import UstcLandingPage from "./UstcLandingPage";
import XhefLandingPage from "./XhefLandingPage";
import DemoLandingPage from "./DemoLandingPage";
import YqdLandingPage from "./YqdLandingPage";
import SylpLandingPage from "./SylpLandingPage";

const whiteLabel = process.env.NEXT_PUBLIC_WHITE_LABEL || "yuantu";

export default function StaticPageContainer({
  pageType,
  children,
}: {
  children: ReactNode;
  pageType?: AppPageType;
}) {
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
