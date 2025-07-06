import { Tooltip, Text, TextProps } from "@chakra-ui/react";

/**
 * Default max width is 200px.
 */
export default function TruncatedTextWithTooltip({
  text,
  maxW,
  ...rest
}: {
  text: string | null | undefined;
} & TextProps) {
  return text ? (
    <Tooltip label={text}>
      <Text isTruncated maxW={maxW ?? "200px"} {...rest}>
        {text}
      </Text>
    </Tooltip>
  ) : (
    <></>
  );
}
