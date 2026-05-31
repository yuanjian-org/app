import { VStack, Text, Link } from "@chakra-ui/react";
import PageBreadcrumb from "components/PageBreadcrumb";
import NextLink from "next/link";
import { paragraphSpacing } from "theme/metrics";

export default function Page() {
  return (
    <VStack spacing={paragraphSpacing} align="start">
      <PageBreadcrumb current="远图平台体验版" />
      <Text>
        欢迎来到远图平台体验版。这是一个用于演示和测试目的的独立环境。
      </Text>
      <Text>
        在这个平台上，你可以体验远图社会导师服务平台的功能。请注意，这里的数据仅用于演示，不与正式环境同步。
      </Text>
      <Text>
        如果你想访问正式的远图平台，请前往：
        <Link
          as={NextLink}
          href="https://yuantuapp.com"
          isExternal
          color="blue.500"
        >
          yuantuapp.com
        </Link>
      </Text>
    </VStack>
  );
}

Page.title = "体验版首页";
