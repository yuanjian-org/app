import { ReactNode } from "react";
import {
  VStack,
  Flex,
  Button,
  FlexProps,
  ButtonProps,
  StackProps,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";

interface BaseLandingPageProps {
  children: ReactNode;
  spacing?: StackProps["spacing"];
  mt?: StackProps["mt"];
  buttonMt?: ButtonProps["mt"];
  actionText?: ReactNode;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
}

export default function BaseLandingPage({
  children,
  spacing = 6,
  mt = 10,
  buttonMt = 4,
  actionText = "进入远图",
  buttonProps,
  flexProps,
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
      {actionText}
    </Button>
  );

  return (
    <>
      <VStack spacing={spacing} align="start" mt={mt}>
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
