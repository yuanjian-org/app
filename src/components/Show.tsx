import { breakpoint } from "theme/metrics";
import { Show, ShowProps } from "@chakra-ui/react";

export function ShowOnDesktop({ children, ...rest }: ShowProps) {
  return <Show above={breakpoint} {...rest}>
    {children}
  </Show>;
}

export function ShowOnMobile({ children, ...rest }: ShowProps) {
  return <Show below={breakpoint} {...rest}>
    {children}
  </Show>;
}
