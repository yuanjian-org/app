import React, { ReactNode } from "react";
import {
  VStack,
  Button,
  Flex,
  StackProps,
  ButtonProps,
  FlexProps,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
// @i18n-ignore-file
import { loginUrl } from "shared/loginUrl";
import T from "components/T";

export interface BaseLandingPageProps extends StackProps {
  children: ReactNode;
  buttonText?: ReactNode;
  buttonMt?: number | string;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
  ns?: string;
}

export default function BaseLandingPage({
  children,
  buttonText = "进入远图",
  buttonMt = 4,
  buttonProps,
  flexProps,
  ns,
  ...stackProps
}: BaseLandingPageProps) {
  const buttonContent = ns ? <T ns={ns}>{buttonText as string}</T> : buttonText;

  const button = (
    <Button
      size="lg"
      variant="brand"
      as={NextLink}
      href={loginUrl()}
      mt={flexProps ? undefined : buttonMt}
      rightIcon={<ChevronRightIcon />}
      {...buttonProps}
    >
      {buttonContent}
    </Button>
  );

  return (
    <>
      <VStack
        spacing={stackProps.spacing ?? 6}
        align={stackProps.align ?? "start"}
        mt={stackProps.mt ?? 10}
        {...stackProps}
      >
        {children}
        {!flexProps && button}
      </VStack>

      {flexProps && (
        <Flex mt={buttonMt} {...flexProps}>
          {button}
        </Flex>
      )}
    </>
  );
}
