import { Icon, IconProps } from "@chakra-ui/react";

/**
 * https://chakra-ui.com/docs/components/icon#using-the-icon-component
 */
export const CircleIcon = (props: IconProps) => (
  <Icon viewBox="0 0 200 200" {...props}>
    <path
      fill="currentColor"
      d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0"
    />
  </Icon>
);
