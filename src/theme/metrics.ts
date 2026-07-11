import { breakpoint } from "theme/breakpoints";

export const sectionSpacing = 6;

export const paragraphSpacing = 4;

export const componentSpacing = 4;

// Actual content width = publicPageMaxWidth - pageMarginX
export const publicPageMaxWidth = 850;
export const publicPageMaxWidthWide = 1200;

export const pageMarginX = {
  base: "16px",
  [breakpoint]: "30px",
};

export const pageMarginTop = {
  base: "25px",
  [breakpoint]: "40px",
};

// https://v2.chakra-ui.com/docs/components/container/usage#container-size
export const maxTextWidth = "60ch";
