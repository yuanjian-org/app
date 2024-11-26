import { Button, InputGroup, InputLeftElement, Input, Heading } from '@chakra-ui/react';
import { EmailIcon } from '@chakra-ui/icons';
import { getProviders, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import z from "zod";
import { useRouter } from 'next/router';
import { parseQueryString } from "shared/strings";
import { toast } from 'react-toastify';
import trpc from 'trpc';
import { RoleProfiles } from 'shared/Role';
import type { GetServerSideProps } from "next";
import Image from 'next/image';

export const localStorageKeyForLoginCallbackUrl = "loginCallbackUrl";
export const localStorageKeyForLoginEmail = "loginEmail";

export const callbackUrlKey = "callbackUrl";

type Provider = {
  id: string
  name: string
  type: string
  signinUrl: string
  callbackUrl: string
}

type PageProps = {
  providers: Record<string, Provider>
}

/**
 * Use `?callbackUrl=...` in the URL to specify the URL to redirect to after
 * logging in.
 */
export default function Page({ providers }: PageProps) {
  const router = useRouter();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
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

  // 邮件登录的提交逻辑
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

  return <>
    <Heading size="md" marginBottom={10}>社会导师服务平台</Heading>

    {/* 显示所有登录选项 */}
    {!selectedProvider && providers && Object.values(providers).map((provider) => (
      <Button
        key={provider.id}
        width="full"
        mt={4}
        leftIcon={provider.name === 'WeChat' ? 
          <Image src="/login/wechat.svg" alt="" width={24} height={24} /> : 
          provider.id === 'sendgrid' ? <EmailIcon /> : undefined
        }
        onClick={() => {
          if (provider.id === 'sendgrid') {
            setSelectedProvider('sendgrid');
          } else {
            void signIn(provider.id);
          }
        }}
      >
        使用{provider.id === 'sendgrid' ? '邮箱' : provider.name}登录
      </Button>
    ))}

    {/* 邮件登录表单 */}
    {selectedProvider === 'sendgrid' && (
      <>
        <InputGroup mt={4}>
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
          mt={4}
          isDisabled={!isValidEmail()}
          isLoading={isLoading} 
          onClick={submitEmail}
        >
          发送验证码
        </Button>

        <Button
          width="full"
          mt={4}
          variant="ghost"
          onClick={() => setSelectedProvider(null)}
        >
          返回
        </Button>
      </>
    )}
  </>;
}

export const getServerSideProps: GetServerSideProps = async () => {
  const providers = await getProviders();
  
  return {
    props: {
      providers: providers ?? {},
    },
  };
};
