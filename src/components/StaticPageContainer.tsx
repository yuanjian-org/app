import { Box, Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import StaticNavBar from "components/StaticNavBar";
import { ReactNode } from "react";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import useStaticGlobalConfigs from "./useStaticGlobalConfigs";
import UstcLandingPage from "./UstcLandingPage";

export default function StaticPageContainer({
  children,
}: {
  children: ReactNode;
}) {
  const { data } = useStaticGlobalConfigs();

  if (data?.whiteLabel === "ustc") {
    return <UstcLandingPage />;
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
