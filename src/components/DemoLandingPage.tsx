import { Link, Text, Heading } from "@chakra-ui/react";
// @i18n-ignore-file
import BaseLandingPage from "./BaseLandingPage";

export default function DemoLandingPage() {
  return (
    <BaseLandingPage buttonText="进入远图体验版" buttonWrapperProps={{ mt: 4 }}>
      <Heading size="lg">欢迎来到远图平台体验版</Heading>
      <Text>
        这是一个用于演示和测试目的的独立环境。在这个平台上，您可以体验远图社会导师服务平台的功能。
        请注意，这里的数据仅用于演示，不与正式环境同步，并且每天会重置一次。
      </Text>
      <Text>
        如果您想访问正式的远图平台，请前往{" "}
        <Link href="https://yuantuapp.com" isExternal>
          yuantuapp.com
        </Link>
        。
      </Text>
      <Text>
        如果您想获取体验版的登录账号，
        <Link
          href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
          isExternal
        >
          请联系我们
        </Link>
        。
      </Text>
    </BaseLandingPage>
  );
}
