import { createBreakpoints } from "@chakra-ui/theme-tools";

// Copied from https://github.com/horizon-ui/horizon-ui-chakra/blob/bf44338c30b7a3d07770f424dfe2ec036c0033ab/src/theme/foundations/breakpoints.js
const breakpoints = createBreakpoints({
  sm: "320px",
  "2sm": "380px",
  md: "768px",
  lg: "960px",
  xl: "1200px",
  "2xl": "1600px",
  "3xl": "1920px",
});

export default breakpoints;