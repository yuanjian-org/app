import { Box, BoxProps } from "@chakra-ui/react";
import { desktopSidebarWidth, sideBarBorderColor } from "components/Sidebar";
import { useEffect, useRef, useState } from "react";
import { breakpoint, pageMarginTop, componentSpacing } from "theme/metrics";
import { pageMarginX } from "theme/metrics";

export const topBarPaddings = {
  ps: pageMarginX,
  // Avoid the sidebar menu icon on mobile
  pe: { base: "70px", [breakpoint]: 4 },
  pt: pageMarginTop,
  pb: componentSpacing,
};

export default function TopBar({ children, ...rest }: BoxProps) {
  const refTopbar = useRef<HTMLDivElement>(null);
  const [fixedBoxBottom, setFixedBoxBottom] = useState(0);

  useEffect(() => {
    if (refTopbar.current) {
      const rect = refTopbar.current.getBoundingClientRect();
      setFixedBoxBottom(rect.bottom);
    }
  }, [refTopbar]);

  return <>
    <Box
      position="fixed" 
      w={{ base: "100%", [breakpoint]: `calc(100% - ${desktopSidebarWidth})` }}
      bg="white"
      borderBottom="1px"
      borderColor={sideBarBorderColor}
      shadow="sm"
      ref={refTopbar}
      {...rest}
    >
      {children}
    </Box>

    {/* Placeholder to push down other content on the page */}
    <Box height={`${fixedBoxBottom}px`} />
  </>;
}
