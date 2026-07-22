import { VStack, Flex, Button, FlexProps, ButtonProps } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";

interface BaseLandingPageProps {
  children: React.ReactNode;
  buttonText: React.ReactNode;
  spacing?: number | string;
  mt?: number | string;
  buttonMt?: number | string;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
}

export default function BaseLandingPage({
  children,
  buttonText,
  spacing,
  mt,
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
      {buttonText}
    </Button>
  );

  return (
    <VStack spacing={spacing} align="start" mt={mt}>
      {children}
      {flexProps ? <Flex {...flexProps}>{button}</Flex> : button}
    </VStack>
  );
}
