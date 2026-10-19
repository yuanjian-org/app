import {
  VStack,
  Flex,
  Button,
  ButtonProps,
  StackProps,
  FlexProps,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import { ReactNode } from "react";

interface BaseLandingPageProps {
  children: ReactNode;
  actionText?: ReactNode;
  spacing?: StackProps["spacing"];
  buttonMt?: ButtonProps["mt"];
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
}

export default function BaseLandingPage({
  children,
  actionText = "进入远图",
  spacing = 6,
  buttonMt = 4,
  buttonProps,
  flexProps,
}: BaseLandingPageProps) {
  return (
    <VStack spacing={spacing} align="start" mt={10}>
      {children}
      <Flex mt={buttonMt} width="100%" {...flexProps}>
        <Button
          size="lg"
          variant="brand"
          as={NextLink}
          href={loginUrl()}
          rightIcon={<ChevronRightIcon />}
          {...buttonProps}
        >
          {actionText}
        </Button>
      </Flex>
    </VStack>
  );
}
