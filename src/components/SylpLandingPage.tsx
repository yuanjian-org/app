import { VStack, Flex, Button, Text, Heading } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import T from "components/T";
import BaseLandingPage from "./BaseLandingPage";

export default function SylpLandingPage() {
  return (
    <BaseLandingPage
      title="可持续青年领袖计划 | Sustainable Youth Leadership Program"
      wide
      showLanguageToggle
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
          <T ns="sylp">进入平台</T>
        </Button>
      </Flex>
    </BaseLandingPage>
  );
}
