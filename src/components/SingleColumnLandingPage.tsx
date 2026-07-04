import { Box, Spacer, VStack, Button, Heading } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import Footer from "components/Footer";
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import Head from "next/head";
import React from "react";
import { SharedLandingNavBar } from "./SharedLandingNavBar";

export function SingleColumnLandingPage({
  title,
  heading,
  buttonLabel,
  children,
}: {
  title: string;
  heading: string;
  buttonLabel: string;
  children: React.ReactNode;
}) {
  return (
    <VStack minHeight="100vh">
      <Head>
        <title>{title}</title>
      </Head>
      <SharedLandingNavBar />

      <Box
        maxWidth={staticPageMaxWidth}
        paddingX={pageMarginX}
        w="100%"
        mt="70px"
      >
        <VStack spacing={6} align="start" mt={10}>
          <Heading size="lg">{heading}</Heading>

          {children}

          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={loginUrl()}
            mt={4}
            rightIcon={<ChevronRightIcon />}
          >
            {buttonLabel}
          </Button>
        </VStack>
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
