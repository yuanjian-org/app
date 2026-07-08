import {
  Box,
  Spacer,
  VStack,
  Flex,
  HStack,
  Button,
  Link,
  Tooltip,
} from "@chakra-ui/react";
import Footer from "components/Footer";
import {
  pageMarginX,
  staticPageMaxWidth,
  staticPageMaxWidthWide,
} from "theme/metrics";
import NextLink from "next/link";
import DynamicLogo from "components/DynamicLogo";
import { loginUrl } from "shared/loginUrl";
import { RiCustomerServiceFill } from "react-icons/ri";
import Head from "next/head";
import { ReactNode } from "react";

export default function BaseLandingPage({
  title,
  navContactTooltip = "联系客服",
  navLoginText = "登录 / 注册",
  wide = false,
  children,
}: {
  title: string;
  navContactTooltip?: string;
  navLoginText?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const maxWidth = wide ? staticPageMaxWidthWide : staticPageMaxWidth;

  return (
    <VStack minHeight="100vh">
      <Head>
        <title>{title}</title>
      </Head>
      <Box
        as="nav"
        w="100%"
        bgColor="white"
        boxShadow="sm"
        position="sticky"
        top="0"
        zIndex="999"
      >
        <Flex
          height={16}
          justifyContent="space-between"
          paddingX={pageMarginX}
          maxW={maxWidth}
          alignItems="center"
          marginX="auto"
        >
          <DynamicLogo />

          <HStack as="nav" spacing={7} fontWeight="bold">
            <Tooltip label={navContactTooltip}>
              <Link
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                isExternal
              >
                <RiCustomerServiceFill />
              </Link>
            </Tooltip>

            <Button variant="brand" as={NextLink} href={loginUrl()}>
              {navLoginText}
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box maxWidth={maxWidth} paddingX={pageMarginX} w="100%" mt="70px">
        {children}
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
