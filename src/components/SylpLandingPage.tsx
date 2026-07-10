import {
  Box,
  Spacer,
  VStack,
  Flex,
  HStack,
  Button,
  Text,
  Heading,
  Link,
  Tooltip,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import Footer from "components/Footer";
import { pageMarginX, staticPageMaxWidthWide } from "theme/metrics";
import NextLink from "next/link";
import DynamicLogo from "components/DynamicLogo";
import { loginUrl } from "shared/loginUrl";
import { RiCustomerServiceFill } from "react-icons/ri";
import Head from "next/head";
import T from "components/T";
import LanguageToggle from "components/LanguageToggle";
import { useTranslation } from "next-i18next";

export default function SylpLandingPage() {
  const { t } = useTranslation("common");

  return (
    <VStack minHeight="100vh">
      <Head>
        <title>可持续青年领袖计划 | Sustainable Youth Leadership Program</title>
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
          maxW={staticPageMaxWidthWide}
          alignItems="center"
          marginX="auto"
        >
          <DynamicLogo />

          <HStack as="nav" spacing={7} fontWeight="bold">
            <LanguageToggle />
            <Tooltip label={t("联系客服")}>
              <Link
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                isExternal
              >
                <RiCustomerServiceFill />
              </Link>
            </Tooltip>

            <Button variant="brand" as={NextLink} href={loginUrl()}>
              <T ns="sylp">登录 ｜ Login</T>
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box
        maxWidth={staticPageMaxWidthWide}
        paddingX={pageMarginX}
        w="100%"
        mt="70px"
      >
        <VStack spacing={6} align="start" mt={10}>
          <Heading size="lg">
            <T ns="sylp">欢迎来到可持续青年领袖计划 (SYLP)</T>
          </Heading>
          <Text>
            <T ns="sylp" token="sylp-p1">
              “可持续青年领袖计划”由上海颂鼎社会公益创新发展中心（SSIC）发起，旨在培养具备全球视野、跨文化沟通能力与深刻社会责任感的下一代领导者。通过融合ESG理念与创新实践，我们为杰出青年提供跨部门协同的实践平台。
            </T>
          </Text>
          <Text>
            <T ns="sylp" token="sylp-p2">
              在这里，优秀的国际留学生将与行业顶尖导师同行，深入探索社会创新、可持续发展及企业社会责任（CSR）。项目旨在通过多元视角的碰撞与真实案例的研讨，激发创新思维，培养解决全球性复杂问题的能力，助力青年领袖在全球舞台上发出中国声音，贡献青春力量。
            </T>
          </Text>
          <Heading size="md" pt={4}>
            <T ns="sylp">AI 数字赋能全球青年可持续发展创新平台</T>
          </Heading>
          <Text>
            <T ns="sylp" token="sylp-p3">
              AI
              数字赋能全球青年可持续发展创新平台为本项目提供全链路的导师匹配与项目管理服务，护航您的创新与成长之旅。
            </T>
          </Text>
        </VStack>

        <Flex mt={12} justifyContent="center" width="100%">
          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={loginUrl()}
            rightIcon={<ChevronRightIcon />}
            width={{ base: "100%", md: "auto" }}
          >
            <T ns="sylp">进入平台 ｜ Enter</T>
          </Button>
        </Flex>
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
