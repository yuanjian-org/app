import { VStack, Flex, Button, FlexProps, ButtonProps } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";

interface BaseLandingPageProps {
  children: React.ReactNode;
  spacing?: number;
  vStackMt?: number | string;
  buttonMt?: number | string;
  buttonProps?: ButtonProps;
  flexProps?: FlexProps;
  buttonText?: React.ReactNode;
}

export default function BaseLandingPage({
  children,
  spacing = 6,
  vStackMt = 10,
  buttonMt = 4,
  buttonProps,
  flexProps,
  buttonText,
}: BaseLandingPageProps) {
  return (
    <>
      <VStack spacing={spacing} align="start" mt={vStackMt}>
        {children}
      </VStack>
      {flexProps ? (
        <Flex mt={buttonMt} {...flexProps}>
          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={loginUrl()}
            rightIcon={<ChevronRightIcon />}
            {...buttonProps}
          >
            {buttonText || "进入远图"}
          </Button>
        </Flex>
      ) : (
        <Button
          size="lg"
          variant="brand"
          as={NextLink}
          href={loginUrl()}
          mt={buttonMt}
          rightIcon={<ChevronRightIcon />}
          {...buttonProps}
        >
          {buttonText || "进入远图"}
        </Button>
      )}
    </>
  );
}
