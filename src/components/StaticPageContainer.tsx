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
import YqdLandingPage from "./YqdLandingPage";
import SylpLandingPage from "./SylpLandingPage";
import { useRouter } from "next/router";

export default function StaticPageContainer({
  pageType,
  children,
}: {
  children: ReactNode;
  pageType?: AppPageType;
}) {
  const router = useRouter();

  if (features.projects) {
    if (router.pathname === "/s") {
      return <>{children}</>;
    }
    return (
      <DefaultStaticPageContaner pageType={pageType}>
        {children}
      </DefaultStaticPageContaner>
    );
  }

  // Directly inspect env var so Webpack's DefinePlugin can replace it with a
  // string literal at build time, allowing dead code elimination (DCE) to prune
  // unused landing page imports.
  if (process.env.NEXT_PUBLIC_WHITE_LABEL === "ustc") {
    return <UstcLandingPage />;
  }

  if (process.env.NEXT_PUBLIC_WHITE_LABEL === "xhef") {
    return <XhefLandingPage />;
  }

  if (process.env.NEXT_PUBLIC_WHITE_LABEL === "yqd") {
    return <YqdLandingPage />;
  }

  if (process.env.NEXT_PUBLIC_WHITE_LABEL === "sylp") {
    return <SylpLandingPage />;
  }

  if (router.pathname === "/s") {
    return <>{children}</>;
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
