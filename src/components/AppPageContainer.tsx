import { Spacer, VStack } from "@chakra-ui/react";
import Footer from "components/Footer";
import { PropsWithChildren, useEffect } from "react";

import NavBars from "components/Navbars";
import { breakpoint, pageMarginTop } from "theme/metrics";
import { AppPageType } from "AppPage";
import { pageMarginX } from "theme/metrics";
import PostLoginModels from "./PostLoginModels";
import { useMyId } from "useMe";
import { initFundebug } from "fundebug";

export default function AppPageContainer({
  pageType,
  children,
}: {
  pageType?: AppPageType;
} & PropsWithChildren) {
  const myId = useMyId();

  useEffect(() => {
    // Note that we don't reset the user id when the user logs out.
    if (myId) initFundebug(myId);
  }, [myId]);

  return (
    <>
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
