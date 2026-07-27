import { VStack, Button, Flex, ButtonProps, FlexProps } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import React from "react";

interface BaseLandingPageProps {
  children: React.ReactNode;
  actionText?: React.ReactNode;
  spacing?: number;
  mt?: number;
  buttonMt?: number;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
}

export default function BaseLandingPage({
  children,
  actionText = "进入远图",
  spacing = 6,
  mt = 10,
  buttonMt = 4,
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
      <VStack spacing={spacing} align="start" mt={mt}>
        {children}
        {!flexProps && button}
      </VStack>
      {flexProps && <Flex {...flexProps}>{button}</Flex>}
    </>
  );
}
