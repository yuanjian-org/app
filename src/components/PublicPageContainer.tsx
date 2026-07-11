import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/PublicNavBar";
import { ReactNode } from "react";
import {
  pageMarginX,
  publicPageMaxWidth,
  publicPageMaxWidthWide,
} from "theme/metrics";
import { AppPageType } from "../AppPage";

export default function PublicPageContainer({
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
          pageType === "wide" ? publicPageMaxWidthWide : publicPageMaxWidth
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
