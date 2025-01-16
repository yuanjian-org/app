
export const sectionSpacing = 6;

export const paragraphSpacing = 4;

export const componentSpacing = 4;

// Actual content width = staticPageMaxWidth - pageMarginX
export const staticPageMaxWidth = 850;

/**
 * The mobile-vs-desktop breakpoint.
 * TODO: refactor it into theme/breakpoints.ts
 */
export const breakpoint = "lg";

export const pageMarginX = {
  base: "16px",
  [breakpoint]: "30px"
};

export const pageMarginTop = {
  base: "25px",
  [breakpoint]: "40px"
};

// https://v2.chakra-ui.com/docs/components/container/usage#container-size
export const maxTextWidth = "60ch";
