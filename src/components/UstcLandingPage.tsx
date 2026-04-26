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

export default function UstcLandingPage() {
  return (
    <VStack minHeight="100vh">
      <Head>
        <title>远图：中国科学技术大学社会导师网络</title>
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
          <Heading size="lg">
            欢迎来到“远图”：中国科学技术大学社会导师网络
          </Heading>
          <Text>
            社会导师项目由中科大校友发起并提供，旨在为中科大在校学生提供一对一的陪伴与指导。通过过来人的经验分享与帮助，助力同学们更好地规划学业与职业发展，顺利步入社会。
          </Text>
          <Button
            size="lg"
            variant="brand"
            as={NextLink}
            href={loginUrl()}
            mt={4}
            rightIcon={<ChevronRightIcon />}
          >
            进入远图
          </Button>
        </VStack>
      </Box>
      <Spacer />
      <Footer />
    </VStack>
  );
}
