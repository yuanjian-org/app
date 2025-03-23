import { AbsoluteCenter, Box, BoxProps, Divider, Text } from "@chakra-ui/react";

export default function ListItemDivider({ 
  text,
  textOnly,
  grayText,
  extraSmallText,
  ...boxProps
}: {
  text: string, 
  textOnly?: boolean,
  grayText?: boolean,
  extraSmallText?: boolean,
} & BoxProps) {
  return (
    <Box position='relative' px='10' {...boxProps}>
      {!textOnly && <Divider />}
      <AbsoluteCenter bg='white' px='4'>
        <Text
          textAlign="center"
          color={grayText ? "gray" : "inherit"}
          fontSize={extraSmallText ? "xs" : "sm"}
        >
          {text}
        </Text>
      </AbsoluteCenter>
    </Box>
  );
}
