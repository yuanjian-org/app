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

export default function StaticPageContainer({
  pageType,
  children,
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
