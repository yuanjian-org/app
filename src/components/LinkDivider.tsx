import { Text, TextProps } from "@chakra-ui/react";

export default function LinkDivider(props: TextProps) {
  return (
    <Text color="gray.400" {...props}>
      |
    </Text>
  );
}
