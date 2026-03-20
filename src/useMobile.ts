import { useBreakpointValue } from "@chakra-ui/react";
import { breakpoint } from "theme/breakpoints";

/**
 * This is preferred over <ShowOnDesktop> and <ShowOnMobile> because it avoids
 * mounting unneeded components in the first place.
 */
export default function useMobile() {
  return useBreakpointValue({
    base: true,
    [breakpoint]: false,
  });
}
