import { breakpoint } from "theme/metrics";
import { Show, ShowProps } from "@chakra-ui/react";

/**
 * useMobile() is preferred over this method because it avoids mounting
 * unneeded components in the first place.
 */
export function ShowOnDesktop({ children, ...rest }: ShowProps) {
  return <Show above={breakpoint} {...rest}>
    {children}
  </Show>;
}

/**
 * useMobile() is preferred over this method because it avoids mounting
 * unneeded components in the first place.
 */
export function ShowOnMobile({ children, ...rest }: ShowProps) {
  return <Show below={breakpoint} {...rest}>
    {children}
  </Show>;
}
