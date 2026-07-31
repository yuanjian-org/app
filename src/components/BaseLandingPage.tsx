import {
  VStack,
  Button,
  ButtonProps,
  StackProps,
  FlexProps,
  Flex,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import React from "react";

export interface BaseLandingPageProps {
  children?: React.ReactNode;
  spacing?: StackProps["spacing"];
  align?: StackProps["align"];
  mt?: StackProps["mt"];
  buttonText?: string | React.ReactNode;
  buttonMt?: ButtonProps["mt"];
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
}

export default function BaseLandingPage({
  children,
  spacing = 6,
  align = "start",
  mt = 10,
  buttonText = "进入远图",
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
      {buttonText}
    </Button>
  );

  if (flexProps) {
    return (
      <>
        <VStack spacing={spacing} align={align} mt={mt}>
          {children}
        </VStack>
        <Flex {...flexProps}>{button}</Flex>
      </>
    );
  }

  return (
    <VStack spacing={spacing} align={align} mt={mt}>
      {children}
      {button}
    </VStack>
  );
}
