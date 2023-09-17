import { Button, InputGroup, InputLeftElement, Input, Heading } from '@chakra-ui/react';
import { EmailIcon } from '@chakra-ui/icons';
import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import z from "zod";
import { useRouter } from 'next/router';
import { parseQueryString } from "shared/strings";
import { toast } from 'react-toastify';

export const localStorageKeyForLoginCallbackUrl = "loginCallbackUrl";
export const localStorageKeyForLoginEmail = "loginEmail";

/**
 * Use `?callbackUrl=...` in the URL to specify the URL to redirect to after logging in.
 */
export default function Login() {
  const router = useRouter();

  // Use the last login email
  const [email, setEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Protect local storage reads from being called without a browser window, which may occur during server-side
  // rendering and prerendering (by Vercel at build time).
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
      console.error(`Unkonwn error on /auht/verify: ${err}`);
      toast.error(`糟糕，系统错误，请联系管理员：${err}`);
    }  
  }, [router]);

  const submit = async () => {
    const callbackUrl = parseQueryString(router, "callbackUrl") ?? "/";
    setIsLoading(true);
    try {
      const res = await signIn('sendgrid', { email, callbackUrl, redirect: false });
      if (!res || res.error) {
        const err = res?.error ?? "Null response from `signIn()`.";
        console.error(err);
        toast.error(`糟糕，遇到错误：${err}`);
      } else {
        localStorage.setItem(localStorageKeyForLoginCallbackUrl, callbackUrl);
        localStorage.setItem(localStorageKeyForLoginEmail, email);
        router.push(`/auth/verify`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = () => z.string().email().safeParse(email).success;

  return <>
    <Heading size="md" marginBottom={10}>欢迎来到远图</Heading>

    <InputGroup>
      <InputLeftElement pointerEvents='none'>
        <EmailIcon color='gray.400' />
      </InputLeftElement>

      {/* `name="email"` to hint password management tools about the nature of this input */}
      <Input type="email" name="email" minWidth={80} placeholder="请输入邮箱" autoFocus 
        value={email} onChange={(ev) => setEmail(ev.target.value)}
        onKeyDown={ev => { if (ev.key == "Enter" && isValidEmail()) submit(); }}
      />
    </InputGroup>

    <Button variant="brand" width="full" onClick={submit} isDisabled={!isValidEmail()}
      isLoading={isLoading}
    >登录 / 注册</Button>
  </>;
}
