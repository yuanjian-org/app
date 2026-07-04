import {
  Box,
  Spacer,
  VStack,
  Flex,
  Button,
  Text,
  Heading,
  SimpleGrid,
} from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import { SharedLandingNavBar } from "./SharedLandingNavBar";
import Footer from "components/Footer";
import { pageMarginX, staticPageMaxWidthWide } from "theme/metrics";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import Head from "next/head";

export default function SylpLandingPage() {
  return (
    <VStack minHeight="100vh">
      <Head>
        <title>可持续青年领袖计划 | Sustainable Youth Leadership Program</title>
      </Head>
      <SharedLandingNavBar
        maxWidth={staticPageMaxWidthWide}
        contactLabel="联系客服 / Contact Support"
        loginLabel="登录 ｜ Login"
      />

      <Box
        maxWidth={staticPageMaxWidthWide}
        paddingX={pageMarginX}
        w="100%"
        mt="70px"
      >
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10} mt={10}>
          {/* Chinese Content */}
          <VStack spacing={6} align="start">
            <Heading size="lg">欢迎来到可持续青年领袖计划 (SYLP)</Heading>
            <Text>
              “可持续青年领袖计划”由上海颂鼎社会公益创新发展中心（SSIC）发起，旨在培养具备全球视野、跨文化沟通能力与深刻社会责任感的下一代领导者。通过融合ESG理念与创新实践，我们为杰出青年提供跨部门协同的实践平台。
            </Text>
            <Text>
              在这里，优秀的国际留学生将与行业顶尖导师同行，深入探索社会创新、可持续发展及企业社会责任（CSR）。项目旨在通过多元视角的碰撞与真实案例的研讨，激发创新思维，培养解决全球性复杂问题的能力，助力青年领袖在全球舞台上发出中国声音，贡献青春力量。
            </Text>
            <Heading size="md" pt={4}>
              AI 数字赋能全球青年可持续发展创新平台
            </Heading>
            <Text>
              AI
              数字赋能全球青年可持续发展创新平台为本项目提供全链路的导师匹配与项目管理服务，护航您的创新与成长之旅。
            </Text>
          </VStack>

          {/* English Content */}
          <VStack spacing={6} align="start">
            <Heading size="lg">
              Welcome to the Sustainable Youth Leadership Program
            </Heading>
            <Text>
              Initiated by the Shanghai Songding Social Innovation and
              Development Center (SSIC), the Sustainable Youth Leadership
              Program aims to cultivate the next generation of leaders equipped
              with a global perspective, cross-cultural communication skills,
              and a profound sense of social responsibility. By integrating ESG
              principles with innovative practices, we provide a cross-sector
              collaborative platform for outstanding youth.
            </Text>
            <Text>
              Here, elite international students will walk alongside top-tier
              industry mentors, delving deeply into social innovation,
              sustainable development, and Corporate Social Responsibility
              (CSR). The program seeks to ignite innovative thinking and develop
              problem-solving skills for complex global issues through the
              collision of diverse perspectives and the study of real-world
              cases, empowering youth leaders to make an impact on the global
              stage.
            </Text>
            <Heading size="md" pt={4}>
              AI Digital Empowerment Platform for Global Youth Sustainable
              Development Innovation
            </Heading>
            <Text>
              The AI Digital Empowerment Platform for Global Youth Sustainable
              Development Innovation provides comprehensive mentor matching and
              project management services for this initiative, safeguarding your
              journey of innovation and growth.
            </Text>
          </VStack>
        </SimpleGrid>

        <Flex mt={12} justifyContent="center" width="100%">
          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={loginUrl()}
            rightIcon={<ChevronRightIcon />}
            width={{ base: "100%", md: "auto" }}
          >
            进入平台 ｜ Enter
          </Button>
        </Flex>
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
