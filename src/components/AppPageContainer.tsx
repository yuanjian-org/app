import { Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import { PropsWithChildren, useEffect } from "react";

import NavBars from "components/Navbars";
import DemoBanner from "./DemoBanner";
import { breakpoint, pageMarginTop } from "theme/metrics";
import { AppPageType } from "AppPage";
import { pageMarginX } from "theme/metrics";
import PostLoginModels from "./PostLoginModels";
import { useMyId } from "useMe";
import { initFundebug } from "fundebug";

export default function AppPageContainer({
  pageType,
  isDemo,
  children,
}: {
  pageType?: AppPageType;
  isDemo?: boolean;
} & PropsWithChildren) {
  const myId = useMyId();

  useEffect(() => {
    // Note that we don't reset the user id when the user logs out.
    if (myId) initFundebug(myId);
  }, [myId]);

  return (
    <>
      <DemoBanner isDemo={isDemo} />
      <NavBars>
        {pageType === "bare" ? (
          children
        ) : (
          <VStack
            minH="100vh"
            align="stretch"
            {...(pageType !== "full" && {
              px: pageMarginX,
              pt: pageMarginTop,
            })}
            maxWidth={{
              base: "100%",
              ...(pageType === undefined && { xl: "1200px" }),
            }}
            spacing={0}
          >
            {children}

            <Spacer />
            <Footer alignItems={{ base: "center", [breakpoint]: "start" }} />
          </VStack>
        )}
      </NavBars>

      <PostLoginModels />
    </>
  );
}
