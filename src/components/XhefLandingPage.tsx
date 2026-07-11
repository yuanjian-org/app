import { VStack, Button, Text, Heading } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import T from "components/T";
import BaseLandingPage from "./BaseLandingPage";

export default function XhefLandingPage() {
  return (
    <BaseLandingPage title="远图：珍珠生导师网络">
      <VStack spacing={6} align="start" mt={10}>
        <Heading size="lg">
          <T>欢迎来到珍珠生导师网络</T>
        </Heading>
        <Text>
          社会导师项目旨在为大学珍珠生提供一对一的陪伴与指导。通过过来人的经验分享与帮助，助力同学们更好地规划学业与职业发展，顺利步入社会。“远图”
          是支持这一项目的服务平台。
        </Text>
        <Button
          size="lg"
          variant="brand"
          as={NextLink}
          href={loginUrl()}
          mt={4}
          rightIcon={<ChevronRightIcon />}
        >
          <T>进入远图</T>
        </Button>
      </VStack>
    </BaseLandingPage>
  );
}
