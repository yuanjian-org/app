import { Box, BoxProps } from "@chakra-ui/react";

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
    top={0}
    right="-18px"
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
