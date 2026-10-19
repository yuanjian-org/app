import {
  VStack,
  Button,
  ButtonProps,
  FlexProps,
  StackProps,
  Flex,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import { ReactNode } from "react";

interface BaseLandingPageProps {
  children: ReactNode;
  actionText?: ReactNode;
  actionHref?: string;
  spacing?: StackProps["spacing"];
  vStackProps?: StackProps;
  flexProps?: FlexProps;
  buttonProps?: ButtonProps;
  buttonMt?: number | string;
}

export default function BaseLandingPage({
  children,
  actionText = "进入远图",
  actionHref = loginUrl(),
  spacing = 6,
  vStackProps,
  flexProps,
  buttonProps,
  buttonMt = 4,
}: BaseLandingPageProps) {
  return (
    <VStack spacing={spacing} align="start" mt={10} {...vStackProps}>
      {children}
      <Flex mt={buttonMt} justifyContent="start" width="100%" {...flexProps}>
        <Button
          size="lg"
          variant="brand"
          as={NextLink}
          href={actionHref}
          rightIcon={<ChevronRightIcon />}
          width={{ base: "100%", md: "auto" }}
          {...buttonProps}
        >
          {actionText}
        </Button>
      </Flex>
    </VStack>
  );
}
