import { VStack, Button, Text, Heading } from "@chakra-ui/react";
import { ChevronRightIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import T from "components/T";
import Head from "next/head";

export default function UstcLandingPage() {
  return (
    <>
      <Head>
        <title>远图：中国科学技术大学社会导师网络</title>
      </Head>
      <VStack spacing={6} align="start" mt={10}>
        <Heading size="lg">
          <T>欢迎来到中国科学技术大学社会导师网络</T>
        </Heading>
        <Text>
          社会导师项目由中科大校友发起并提供，旨在为中科大在校学生提供一对一的陪伴与指导。通过过来人的经验分享与帮助，助力同学们更好地规划学业与职业发展，顺利步入社会。“远图”
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
    </>
  );
}
