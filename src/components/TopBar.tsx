import { Box, BoxProps } from "@chakra-ui/react";
import { desktopSidebarWidth, sideBarBorderColor } from "components/Sidebar";
import { useEffect, useRef, useState } from "react";
import { breakpoint, pageMarginTop, componentSpacing } from "theme/metrics";
import { pageMarginX } from "theme/metrics";
import { mobileMenuButtonMarginTop } from "./Navbars";

export const topBarPaddings = {
  ps: pageMarginX,
  // Avoid the sidebar menu icon on mobile
  pe: { base: "70px", [breakpoint]: 4 },
  // On mobile, align top component (such as search box) with the menu button
  pt: { ...pageMarginTop, base: mobileMenuButtonMarginTop },
  pb: componentSpacing,
};

export default function TopBar({ children, ...rest }: BoxProps) {
  const refTopbar = useRef<HTMLDivElement>(null);
  const [fixedBoxBottom, setFixedBoxBottom] = useState(0);

  // Watch for size changes of the topbar
  useEffect(() => {
    if (!refTopbar.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = refTopbar.current?.getBoundingClientRect();
      if (rect) setFixedBoxBottom(rect.bottom);
    });

    resizeObserver.observe(refTopbar.current);

    return () => resizeObserver.disconnect();
  }, []);

  return <>
    <Box
      position="fixed" 
      w={{ base: "100%", [breakpoint]: `calc(100% - ${desktopSidebarWidth})` }}
      bg="white"
      borderBottom="1px"
      borderColor={sideBarBorderColor}
      shadow="sm"
      zIndex={1}
      ref={refTopbar}
      {...rest}
    >
      {children}
    </Box>

    {/* Placeholder to push down other content on the page */}
    <Box height={`${fixedBoxBottom}px`} />
  </>;
}
