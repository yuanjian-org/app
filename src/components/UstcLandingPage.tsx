import { Text, Heading } from "@chakra-ui/react";
import Head from "next/head";
// @i18n-ignore-file
import BaseLandingPage from "./BaseLandingPage";

export default function UstcLandingPage() {
  return (
    <>
      <Head>
        <title>远图：中国科学技术大学社会导师网络</title>
      </Head>
      <BaseLandingPage buttonText="进入远图" spacing={6} mt={10} buttonMt={4}>
        <Heading size="lg">欢迎来到中国科学技术大学社会导师网络</Heading>
        <Text>
          社会导师项目由中科大校友发起并提供，旨在为中科大在校学生提供一对一的陪伴与指导。通过过来人的经验分享与帮助，助力同学们更好地规划学业与职业发展，顺利步入社会。“远图”
          是支持这一项目的服务平台。
        </Text>
      </BaseLandingPage>
    </>
  );
}
