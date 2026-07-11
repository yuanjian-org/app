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
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import NextLink from "next/link";
import DynamicLogo from "components/DynamicLogo";
import { loginUrl } from "shared/loginUrl";
import { RiCustomerServiceFill } from "react-icons/ri";
import Head from "next/head";
import T from "components/T";
import LanguageToggle from "components/LanguageToggle";
import { useTranslation } from "next-i18next/pages";
import StaticNavBar from "components/StaticNavBar";

export default function BaseLandingPage({
  title,
  useStaticNavBar,
  children,
}: {
  title: string;
  useStaticNavBar?: boolean;
  children: React.ReactNode;
}) {
  const { t } = useTranslation("common");

  return (
    <VStack minHeight="100vh">
      <Head>
        <title>{title}</title>
      </Head>

      {useStaticNavBar ? (
        <StaticNavBar />
      ) : (
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
            maxW={staticPageMaxWidth}
            alignItems="center"
            marginX="auto"
          >
            <DynamicLogo />

            <HStack as="nav" spacing={7} fontWeight="bold">
              {/* Directly use env var to enable tree shaking */}
              {process.env.NEXT_PUBLIC_ENABLE_ENGLISH === "true" && (
                <LanguageToggle />
              )}

              <Tooltip label={t("联系客服")}>
                <Link
                  href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                  isExternal
                >
                  <RiCustomerServiceFill />
                </Link>
              </Tooltip>

              <Button variant="brand" as={NextLink} href={loginUrl()}>
                <T>登录 / 注册</T>
              </Button>
            </HStack>
          </Flex>
        </Box>
      )}

      <Box
        maxWidth={staticPageMaxWidth}
        paddingX={pageMarginX}
        w="100%"
        mt="70px"
      >
        {children}
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
