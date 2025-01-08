import { Text, TextProps } from "@chakra-ui/react";

export function SmallGrayText({ children, ...rest }: TextProps) {
  return <Text fontSize="sm" color="gray" {...rest}>{children}</Text>;
}
