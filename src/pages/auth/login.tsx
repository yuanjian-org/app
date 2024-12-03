import { Button, InputGroup, InputLeftElement, Input, Heading, Text, VStack, Link, HStack } from '@chakra-ui/react';
import { EmailIcon } from '@chakra-ui/icons';
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import z from "zod";
import { useRouter } from 'next/router';
import { parseQueryString, parseQueryStringOrUnknown } from "shared/strings";
import { toast } from 'react-toastify';
import trpc from 'trpc';
import { RoleProfiles } from 'shared/Role';
import Image from 'next/image';
import WeChatQRLogin from 'components/WeChatQRLogin';
import { componentSpacing, sectionSpacing } from 'theme/metrics';

export const localStorageKeyForLoginCallbackUrl = "loginCallbackUrl";
export const localStorageKeyForLoginEmail = "loginEmail";

export const callbackUrlKey = "callbackUrl";

type ServerSideProps = {
  wechatQRAppId: string;
};

/**
 * Use `?callbackUrl=...` in the URL to specify the URL to redirect to after
 * logging in.
 */
export default function Page({ wechatQRAppId }: ServerSideProps) {
  const router = useRouter();
  const showWeChat = parseQueryStringOrUnknown(useRouter(), 'demo') === '1';

  // Use the last login email
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Protect local storage reads from being called without a browser window,
  // which may occur during server-side rendering and prerendering (by Vercel at
  // build time).
  useEffect(() => {
    setEmail(localStorage.getItem(localStorageKeyForLoginEmail) ?? "");
  }, []);

  // Show the error passed in by next-auth.js if any.
  useEffect(() => {
    const err = parseQueryString(router, "error");
    if (err == "Verification") {
      toast.error("验证码无效，可能已经过期或者被使用。请重新登录。");
    } else if (err) {
      // See https://next-auth.js.org/configuration/pages#error-page
      console.error(`Unkonwn error on /auth/verify: ${err}`);
      toast.error(`糟糕，系统错误，请联系管理员：${err}`);
    }
  }, [router]);

  const submitEmail = async () => {
    const callbackUrl = parseQueryString(router, callbackUrlKey) ?? "/";
    setIsLoading(true);
    try {
      if (await trpc.users.isBanned.query({ email })) {
        toast.error("此邮箱已被停用，请使用其他邮箱登录。有问题请联系" +
          `${RoleProfiles.UserManager.displayName}。`);
        return;
      }

      const res = await signIn('sendgrid', {
        email,
        callbackUrl,
        redirect: false
      });

      if (!res || res.error) {
        const err = res?.error ?? "Null response from `signIn()`.";
        console.error(err);
        toast.error(`糟糕：${err}`);
      } else {
        localStorage.setItem(localStorageKeyForLoginCallbackUrl, callbackUrl);
        localStorage.setItem(localStorageKeyForLoginEmail, email);
        await router.push(`/auth/verify`);
      }
    } catch (err) {
      const msg = `糟糕，系统错误，请联系管理员：${err}`;
      console.error(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = () => z.string().email().safeParse(email).success;

  const isWechatBrowser = /MicroMessenger/i.test(navigator.userAgent);

  return <>
    <Heading size="md" marginBottom={10}>社会导师服务平台</Heading>

    {/* 微信扫码登录 */}
    {showWeChat && !isWechatBrowser && <VStack spacing={componentSpacing}>
      <Text>微信扫码登录</Text>
      <WeChatQRLogin appid={wechatQRAppId} />
    </VStack>}

    {/* 微信服务号登录 */}
    {showWeChat && isWechatBrowser && <Link
      onClick={() => signIn('wechat')}
    >
      <HStack mb={sectionSpacing}>
        <Image src="/img/wechat.svg" alt="WeChat" width={24} height={24} />
        <Text>微信登录</Text>
      </HStack>
    </Link>}

    {/* 微信扫码登陆(点击版) */}
    {/* <Button
      width="full"
      mt={2}
      leftIcon={<Image src="/img/wechat.svg" alt="WeChat" width={24} height={24} />}
      onClick={() => signIn('wechat-qr')}
      bg="#07C160"
      color="white"
      _hover={{ bg: "#06AE56" }}
    >
      微信扫码登陆(点击版)
    </Button> */}

    {/* Email login */}
    <InputGroup>
      <InputLeftElement pointerEvents='none'>
        <EmailIcon color='gray.400' />
      </InputLeftElement>
      <Input
        type="email"
        name="email"
        minWidth={80}
        placeholder="请输入邮箱"
        autoFocus
        value={email}
        onChange={(ev) => setEmail(ev.target.value)}
        onKeyDown={async ev => {
          if (ev.key == "Enter" && isValidEmail()) await submitEmail();
        }}
      />
    </InputGroup>

    <Button
      variant="brand"
      width="full"
      isDisabled={!isValidEmail()}
      isLoading={isLoading}
      onClick={submitEmail}
    >登录 / 注册</Button>
  </>;
}

export function getServerSideProps(): { props: ServerSideProps } {
  return {
    props: {
      wechatQRAppId: process.env.AUTH_WECHAT_QR_APP_ID ?? "",
    },
  };
}
