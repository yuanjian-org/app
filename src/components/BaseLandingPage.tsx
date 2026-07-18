import {
  VStack,
  Flex,
  FlexProps,
  Button,
  ButtonProps,
  SystemProps,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import Head from "next/head";
import { ReactNode } from "react";
// @i18n-ignore-file
import { loginUrl } from "shared/loginUrl";

export interface BaseLandingPageProps {
  title?: string;
  buttonText?: ReactNode;
  spacing?: SystemProps["margin"];
  mt?: SystemProps["margin"];
  buttonWrapperProps?: FlexProps;
  buttonProps?: ButtonProps;
  children: ReactNode;
}

export default function BaseLandingPage({
  title,
  buttonText = "进入平台",
  spacing = 6,
  mt = 10,
  buttonWrapperProps,
  buttonProps,
  children,
}: BaseLandingPageProps) {
  return (
    <>
      {title && (
        <Head>
          <title>{title}</title>
        </Head>
      )}
      <VStack spacing={spacing} align="start" mt={mt}>
        {children}
        <Flex {...buttonWrapperProps}>
          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={loginUrl()}
            rightIcon={<ChevronRightIcon />}
            {...buttonProps}
          >
            {buttonText}
          </Button>
        </Flex>
      </VStack>
    </>
  );
}
