import { ReactNode } from "react";
import { breakpoint } from "theme/metrics";
import { Show } from "@chakra-ui/react";

export function ShowOnDesktop({ children }: { children: ReactNode }) {
  return <Show above={breakpoint}>
    {children}
  </Show>;
}

export function ShowOnMobile({ children }: { children: ReactNode }) {
  return <Show below={breakpoint}>
    {children}
  </Show>;
}
