import { Link, Text, VStack, Button, Heading } from "@chakra-ui/react";
import NextLink from "next/link";
import { loginUrl } from "shared/loginUrl";
import { ChevronRightIcon } from "@chakra-ui/icons";
import T from "components/T";

export default function XLandingPage() {
  return (
    <VStack spacing={6} align="start" mt={10}>
      <Heading size="lg">
        <T>欢迎来到远图平台体验版</T>
      </Heading>
      <Text>
        这是一个用于演示和测试目的的独立环境。在这个平台上，您可以体验远图社会导师服务平台的功能。
        请注意，这里的数据仅用于演示，不与正式环境同步，并且每天会重置一次。
      </Text>
      <Text>
        <T>如果您想访问正式的远图平台，请前往</T>{" "}
        <Link href="https://yuantuapp.com" isExternal>
          yuantuapp.com
        </Link>
        。
      </Text>
      <Text>
        <T>如果您想获取体验版的登录账号，</T>
        <Link
          href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
          isExternal
        >
          <T>请联系我们</T>
        </Link>
        。
      </Text>
      <Button
        size="lg"
        variant="brand"
        as={NextLink}
        href={loginUrl()}
        mt={4}
        rightIcon={<ChevronRightIcon />}
      >
        <T>进入远图体验版</T>
      </Button>
    </VStack>
  );
}
