import { Box, BoxProps, useDimensions } from "@chakra-ui/react";
import { desktopSidebarWidth, sideBarBorderColor } from "components/Sidebar";
import { useRef } from "react";
import { breakpoint, pageMarginTop, componentSpacing } from "theme/metrics";
import { pageMarginX } from "theme/metrics";
import { mobileSidbarIconLeftWithMargin, mobileSidbarIconTop } from "./Navbars";

export const topBarPaddings = {
  ps: pageMarginX,
  // On mobile, avoid overlap with sidebar icon
  pe: { base: mobileSidbarIconLeftWithMargin, [breakpoint]: 4 },
  // On mobile, align top component (such as search box) with sidebar icon
  pt: { ...pageMarginTop, base: mobileSidbarIconTop },
  pb: componentSpacing,
};

export default function TopBar({ children, ...rest }: BoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  // https://github.com/chakra-ui/chakra-ui/issues/6856
  const dim = useDimensions(ref, true);

  return <>
    <Box
      position="fixed" 
      w={{ base: "100%", [breakpoint]: `calc(100% - ${desktopSidebarWidth})` }}
      bg="white"
      borderBottom="1px"
      borderColor={sideBarBorderColor}
      shadow="sm"
      zIndex={1}
      ref={ref}
      {...rest}
    >
      {children}
    </Box>

    {/* Placeholder to push down other content on the page */}
    <Box height={`${dim?.borderBox.bottom ?? 0}px`} />
  </>;
}
