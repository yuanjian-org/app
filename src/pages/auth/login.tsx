import {
  Button,
  InputGroup,
  InputLeftElement,
  Input, VStack,
  TabList,
  Tab,
  Tabs,
  TabPanels,
  TabPanel,
  Text,
  Link
} from '@chakra-ui/react';
import { EmailIcon } from '@chakra-ui/icons';
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import z from "zod";
import { useRouter } from 'next/router';
import { parseQueryString } from "shared/strings";
import { toast } from 'react-toastify';
import trpc from 'trpc';
import { RoleProfiles } from 'shared/Role';
import EmbeddedWeChatQRLogin from 'components/EmbeddedWeChatQRLogin';
import { componentSpacing, sectionSpacing } from 'theme/metrics';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { staticUrlPrefix } from 'static';
import { IoLogoWechat } from 'react-icons/io5';

export const localStorageKeyForLoginCallbackUrl = "loginCallbackUrl";
export const localStorageKeyForLoginEmail = "loginEmail";

export function loginUrl(callbackUrl?: string) {
  return `/auth/login?${callbackUrlParam(callbackUrl)}`;
}

const callbackUrlKey = "callbackUrl";

export function callbackUrlParam(url: string | undefined) {
  return url ? `${callbackUrlKey}=${encodeURIComponent(url)}` : "";
}

function useCallbackUrl() {
  const router = useRouter();
  return parseQueryString(router, callbackUrlKey) ?? "/";
}

type ServerSideProps = {
  wechatQRAppId: string;
};

/**
 * Use `?callbackUrl=...` in the URL to specify the URL to redirect to after
 * logging in.
 */
export default function Page({ wechatQRAppId }: ServerSideProps) {
  const router = useRouter();

  // Show the error passed in by next-auth.js if any.
  useEffect(() => {
    const err = parseQueryString(router, "error");
    if (err == "Verification") {
      toast.error("验证码无效，可能已经过期或者被使用。请重新登录。");
    } else if (err) {
      // See https://next-auth.js.org/configuration/pages#error-page
      console.error(`Unknown error on /auth/verify: ${err}`);
      toast.error(`糟糕，系统错误，请联系管理员：${err}`);
    }
  }, [router]);

  // https://lzl124631x.github.io/2016/04/08/check-wechat-user-agent.html
  const isWechatMobileBrowser =
    /MicroMessenger/i.test(navigator.userAgent) &&
    /Mobile/i.test(navigator.userAgent);

  return <>
    <PageBreadcrumb
      current="登录"
      parents={[{ name: "社会导师服务平台", link: staticUrlPrefix }]}
    />

    <Tabs
      isFitted
      isLazy
      size='sm'
    >
      <TabList>
        {/* Only WeChat mobile browser supports logging in with WeChat
            accounts. See docs/WeChat.md for more information. */}
        {isWechatMobileBrowser && <Tab>微信登录</Tab>}
        <Tab>微信扫码</Tab>
        <Tab>邮箱验证码</Tab>
        <Tab>邮箱密码</Tab>
      </TabList>

      <TabPanels>

        {/* 微信服务号登录 */}
        {isWechatMobileBrowser && <TabPanel>
          <WechatAccountPanel />
        </TabPanel>}

        {/* 微信扫码登录 */}
        <TabPanel>
          <WechatQRPanel wechatQRAppId={wechatQRAppId} />
        </TabPanel>

        <TabPanel>
          <EmailVerificationPanel />
        </TabPanel>

      </TabPanels>
    </Tabs>
  </>;
}

function WechatQRPanel({ wechatQRAppId }: { wechatQRAppId: string }) {
  const callbackUrl = useCallbackUrl();
  return (
    <VStack spacing={componentSpacing}>
    <Text fontSize="sm" color="gray">
      二维码若无法加载，
      <Link onClick={() => signIn('wechat-qr', { callbackUrl })}>
        点击此处
      </Link>
    </Text>
    <EmbeddedWeChatQRLogin appid={wechatQRAppId}
      callbackUrl={callbackUrl} />
      <MergeAccountHelpText />
    </VStack>
  );
}

function WechatAccountPanel() {
  const callbackUrl = useCallbackUrl();

  return (
    <VStack spacing={componentSpacing}>
    <Button
      width="full"
      mt={sectionSpacing}
      leftIcon={<IoLogoWechat />}
      onClick={() => signIn('wechat', { callbackUrl })}
      bg="#07C160"
      color="white"
      _hover={{ bg: "#06AE56" }}
    >
      微信登录
    </Button>
      <MergeAccountHelpText />
    </VStack>
  );
}

function MergeAccountHelpText() {
  return (
    <Text
      align="center"
      fontSize="sm"
      color="gray"
    >
      如果您曾经使用邮箱登录，在微信登录后，需要人工关联现有账号。请联系平台工作人员协助。
    </Text>
  );
}

function isValidEmail(email: string) {
  return z.string().email().safeParse(email).success;
}

function EmailVerificationPanel() {
  const router = useRouter();
  const callbackUrl = useCallbackUrl();

  // Use the last login email
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Protect local storage reads from being called without a browser window,
  // which may occur during server-side rendering and prerendering (by Vercel at
  // build time).
  useEffect(() => {
    setEmail(localStorage.getItem(localStorageKeyForLoginEmail) ?? "");
  }, []);

  const submitEmail = async () => {
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
        // Display errors on the same page
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

  return (
    <>
      <InputGroup my={sectionSpacing}>
        <InputLeftElement pointerEvents='none'>
          <EmailIcon color='gray.400' />
        </InputLeftElement>
        <Input
          type="email"
          name="email"
          minWidth={80}
          placeholder="请输入邮箱"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          onKeyDown={async ev => {
            if (ev.key == "Enter" && isValidEmail(email)) await submitEmail();
          }}
        />
      </InputGroup>

      <Button
        variant="brand"
        width="full"
        isDisabled={!isValidEmail(email)}
        isLoading={isLoading}
        onClick={submitEmail}
      >登录 / 注册</Button>
    </>
  );
}

export function getServerSideProps(): { props: ServerSideProps } {
  return {
    props: {
      wechatQRAppId: process.env.AUTH_WECHAT_QR_APP_ID ?? "",
    },
  };
}
