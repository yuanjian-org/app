import { VStack, Button, StackProps, ButtonProps } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
// @i18n-ignore-file
import { loginUrl } from "shared/loginUrl";
import Head from "next/head";
import { ReactNode } from "react";

export interface BaseLandingPageProps {
  title?: string;
  spacing?: StackProps["spacing"];
  align?: StackProps["align"];
  mt?: StackProps["mt"];
  buttonMt?: ButtonProps["mt"];
  buttonText?: string;
  buttonProps?: ButtonProps;
  children?: ReactNode;
  flexProps?: StackProps;
}

export default function BaseLandingPage({
  title,
  spacing = 6,
  align = "start",
  mt = 10,
  buttonMt = 4,
  buttonText = "进入远图",
  buttonProps,
  children,
  flexProps,
}: BaseLandingPageProps) {
  return (
    <>
      {title && (
        <Head>
          <title>{title}</title>
        </Head>
      )}
      <VStack spacing={spacing} align={align} mt={mt} {...flexProps}>
        {children}
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
      </VStack>
    </>
  );
}
