import {
  VStack,
  Flex,
  Button,
  StackProps,
  ButtonProps,
  FlexProps,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import React from "react";

export interface BaseLandingPageProps extends StackProps {
  children: React.ReactNode;
  buttonMt?: ButtonProps["mt"];
  buttonText?: React.ReactNode;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
  wrapButtonInFlex?: boolean;
}

export default function BaseLandingPage({
  children,
  buttonMt,
  buttonText = "进入远图",
  buttonProps,
  flexProps,
  wrapButtonInFlex = false,
  ...stackProps
}: BaseLandingPageProps) {
  const actualButtonMt = buttonMt !== undefined ? buttonMt : 4;
  const button = (
    <Button
      size="lg"
      variant="brand"
      as={NextLink}
      href={loginUrl()}
      mt={wrapButtonInFlex ? undefined : actualButtonMt}
      rightIcon={<ChevronRightIcon />}
      {...buttonProps}
    >
      {buttonText}
    </Button>
  );

  return (
    <VStack
      spacing={stackProps.spacing ?? 6}
      align="start"
      mt={stackProps.mt ?? 10}
      {...stackProps}
    >
      {children}
      {wrapButtonInFlex ? (
        <Flex
          mt={actualButtonMt}
          justifyContent="center"
          width="100%"
          {...flexProps}
        >
          {button}
        </Flex>
      ) : (
        button
      )}
    </VStack>
  );
}
