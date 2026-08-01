import {
  VStack,
  Flex,
  Button,
  ButtonProps,
  FlexProps,
  StackProps,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ChevronRightIcon } from "@chakra-ui/icons";
// @i18n-ignore-file
import { loginUrl } from "shared/loginUrl";
import React, { ReactNode } from "react";

export interface BaseLandingPageProps {
  children: ReactNode;
  buttonText?: ReactNode;
  spacing?: StackProps["spacing"];
  buttonMt?: ButtonProps["mt"];
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
  vStackProps?: StackProps;
}

export default function BaseLandingPage({
  children,
  buttonText = "进入远图",
  spacing = 6,
  buttonMt = 4,
  buttonProps,
  flexProps,
  vStackProps,
}: BaseLandingPageProps) {
  const btn = (
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

  return (
    <VStack spacing={spacing} align="start" mt={10} {...vStackProps}>
      {children}

      {flexProps ? (
        <Flex width="100%" {...flexProps}>
          {btn}
        </Flex>
      ) : (
        btn
      )}
    </VStack>
  );
}
