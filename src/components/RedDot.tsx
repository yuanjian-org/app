import { Box, BoxProps } from "@chakra-ui/react";

export const redDotRightOffset = -4;
export const redDotTopOffset = 0;

/**
 * The parent element must have position="relative" unless the positiion prop
 * is overridden.
 */
export default function RedDot({ show, ...rest }: { 
  show: boolean
} & BoxProps) {
  return <Box
    as="span"
    display="inline-block"
    w="8px"
    h="8px"
    borderRadius="full"
    bg="red.400"
    position="absolute"
    top={redDotTopOffset}
    right={redDotRightOffset}
    {...redDotTransitionProps(show)}
    {...rest}
  />;
}

export function redDotTransitionProps(show: boolean) {
  return {
    opacity: show ? 1 : 0,
    transition: "opacity 1s",
  };
}
