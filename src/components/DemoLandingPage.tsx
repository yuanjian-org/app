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
import { pageMarginX, staticPageMaxWidth } from "theme/metrics";
import NextLink from "next/link";
import Image from "next/image";
import yuanjianLogo80x80 from "../../public/img/yuanjian-logo-80x80.png";
import { loginUrl } from "pages/auth/login";
import { staticUrlPrefix } from "static";
import { RiCustomerServiceFill } from "react-icons/ri";
import Head from "next/head";

export default function DemoLandingPage() {
  return (
    <VStack minHeight="100vh">
      <Head>
        <title>体验版首页 | 远图</title>
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
          maxW={staticPageMaxWidth}
          alignItems="center"
          marginX="auto"
        >
          <NextLink href={staticUrlPrefix}>
            <Image src={yuanjianLogo80x80} alt="图标" width={30} />
          </NextLink>

          <HStack as="nav" spacing={7} fontWeight="bold">
            <Tooltip label="联系客服">
              <Link
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                isExternal
              >
                <RiCustomerServiceFill />
              </Link>
            </Tooltip>

            <Button variant="brand" as={NextLink} href={loginUrl()}>
              登录 / 注册
            </Button>
          </HStack>
        </Flex>
      </Box>

      <Box
        maxWidth={staticPageMaxWidth}
        paddingX={pageMarginX}
        w="100%"
        mt="70px"
      >
        <VStack spacing={6} align="start" mt={10}>
          <Heading size="lg">欢迎来到远图平台体验版</Heading>
          <Text>
            这是一个用于演示和测试目的的独立环境。在这个平台上，你可以体验远图社会导师服务平台的功能。
            请注意，这里的数据仅用于演示，不与正式环境同步，并且每天会重置一次。
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
          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={loginUrl()}
            mt={4}
            rightIcon={<ChevronRightIcon />}
          >
            进入远图体验版
          </Button>
        </VStack>
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
