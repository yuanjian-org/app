import { VStack, Flex, Button, FlexProps, ButtonProps } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
// @i18n-ignore-file
import { loginUrl } from "shared/loginUrl";
import { ReactNode } from "react";

export interface BaseLandingPageProps {
  children: ReactNode;
  actionText?: ReactNode;
  spacing?: number | string;
  containerMt?: number | string;
  buttonMt?: number | string;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
}

export default function BaseLandingPage({
  children,
  actionText = "进入远图",
  spacing = 6,
  containerMt = 10,
  buttonMt,
  buttonProps,
  flexProps,
}: BaseLandingPageProps) {
  const button = (
    <Button
      size="lg"
      variant="brand"
      as={NextLink}
      href={loginUrl()}
      mt={buttonMt}
      rightIcon={<ChevronRightIcon />}
      {...buttonProps}
    >
      {actionText}
    </Button>
  );

  return (
    <>
      <VStack spacing={spacing} align="start" mt={containerMt}>
        {children}
        {!flexProps && button}
      </VStack>
      {flexProps && <Flex {...flexProps}>{button}</Flex>}
    </>
  );
}
