import { ReactNode } from "react";
import {
  VStack,
  Button,
  StackProps,
  ButtonProps,
  Flex,
  FlexProps,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
// @i18n-ignore-file
import { loginUrl } from "shared/loginUrl";

export interface BaseLandingPageProps {
  children: ReactNode;
  spacing?: StackProps["spacing"];
  align?: StackProps["align"];
  mt?: StackProps["mt"];
  buttonText?: ReactNode;
  buttonMt?: ButtonProps["mt"];
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
  showButton?: boolean;
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
  showButton = true,
}: BaseLandingPageProps) {
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
      {buttonText}
    </Button>
  );

  return (
    <VStack spacing={spacing} align={align} mt={mt}>
      {children}
      {showButton &&
        (flexProps ? <Flex {...flexProps}>{button}</Flex> : button)}
    </VStack>
  );
}
