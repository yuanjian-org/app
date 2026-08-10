import {
  VStack,
  Flex,
  Button,
  StackProps,
  FlexProps,
  ButtonProps,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";

export interface BaseLandingPageProps extends StackProps {
  children: React.ReactNode;
  buttonText?: React.ReactNode;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
}

export default function BaseLandingPage({
  children,
  buttonText = "进入平台",
  buttonProps,
  flexProps,
  ...props
}: BaseLandingPageProps) {
  return (
    <VStack spacing={6} align="start" mt={10} {...props}>
      {children}
      {flexProps ? (
        <Flex {...flexProps}>
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
      ) : (
        <Button
          size="lg"
          variant="brand"
          as={NextLink}
          href={loginUrl()}
          mt={4}
          rightIcon={<ChevronRightIcon />}
          {...buttonProps}
        >
          {buttonText}
        </Button>
      )}
    </VStack>
  );
}
