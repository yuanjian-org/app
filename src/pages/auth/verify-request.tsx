import { Link, Text } from '@chakra-ui/react';
import AuthPageContainer from 'components/AuthPageContainer';
import NextLink from "next/link";

export default function VerifyRequest() {
  return <AuthPageContainer title="请检查邮箱">
    <Text>您应该已经收到了一封来自远图的邮件。请点击邮件中的链接登录。</Text>

    <Text>否则请检查垃圾邮箱，或者返回上一页重试。</Text>

    <Link as={NextLink} href="/">首页</Link>
  </AuthPageContainer>;
}
