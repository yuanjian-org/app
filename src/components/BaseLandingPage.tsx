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

interface BaseLandingPageProps {
  children: React.ReactNode;
  actionText: React.ReactNode;
  spacing?: StackProps["spacing"];
  mt?: StackProps["mt"];
  align?: StackProps["align"];
  flexProps?: FlexProps;
  buttonMt?: ButtonProps["mt"];
  buttonProps?: ButtonProps;
  actionHref?: string;
}

export default function BaseLandingPage({
  children,
  actionText,
  spacing = 6,
  mt = 10,
  align = "start",
  flexProps,
  buttonMt = 4,
  buttonProps,
  actionHref,
}: BaseLandingPageProps) {
  return (
    <>
      <VStack spacing={spacing} align={align} mt={mt}>
        {children}

        {flexProps ? (
          <Flex mt={buttonMt} {...flexProps}>
            <Button
              size="lg"
              variant="brand"
              as={NextLink}
              href={actionHref ?? loginUrl()}
              rightIcon={<ChevronRightIcon />}
              {...buttonProps}
            >
              {actionText}
            </Button>
          </Flex>
        ) : (
          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={actionHref ?? loginUrl()}
            mt={buttonMt}
            rightIcon={<ChevronRightIcon />}
            {...buttonProps}
          >
            {actionText}
          </Button>
        )}
      </VStack>
    </>
  );
}
