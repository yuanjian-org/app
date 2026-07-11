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
import T from "components/T";
import LanguageToggle from "components/LanguageToggle";
import { useTranslation } from "next-i18next/pages";
import { ReactNode } from "react";
import StaticNavBar from "components/StaticNavBar";
import { AppPageType } from "../AppPage";

interface BaseLandingPageProps {
  title?: string;
  pageType?: AppPageType;
  showLanguageToggle?: boolean;
  useStaticNavBar?: boolean;
  children: ReactNode;
}

export default function BaseLandingPage({
  title,
  pageType,
  showLanguageToggle,
  useStaticNavBar,
  children,
}: BaseLandingPageProps) {
  const { t } = useTranslation("common");

  return (
    <VStack minHeight="100vh">
      {title && (
        <Head>
          <title>{title}</title>
        </Head>
      )}

      {useStaticNavBar ? (
        <StaticNavBar pageType={pageType} />
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
            maxW={
              pageType === "wide" ? staticPageMaxWidthWide : staticPageMaxWidth
            }
            alignItems="center"
            marginX="auto"
          >
            <DynamicLogo />

            <HStack as="nav" spacing={7} fontWeight="bold">
              {showLanguageToggle && <LanguageToggle />}
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
        maxWidth={
          pageType === "wide" ? staticPageMaxWidthWide : staticPageMaxWidth
        }
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
