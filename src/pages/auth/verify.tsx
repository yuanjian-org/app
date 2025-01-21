import {
  Link,
  Text,
  HStack,
  PinInput,
  PinInputField,
  Heading
} from '@chakra-ui/react';
import Loader from 'components/Loader';
import NextLink from "next/link";
import { useRouter } from 'next/router';
import { useState } from 'react';
import { toast } from 'react-toastify';
import {
  callbackUrlParam,
  localStorageKeyForLoginCallbackUrl,
  localStorageKeyForLoginEmail
} from './login';

export default function Page() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const email = localStorage.getItem(localStorageKeyForLoginEmail);
  const callbackUrl = localStorage.getItem(localStorageKeyForLoginCallbackUrl);

  const submit = async (token: string) => {
    setIsLoading(true);
    try {
      if (!email || !callbackUrl) {
        console.error("Email or callbackUrl absent from local storage");
        toast.error("糟糕，无法读取浏览器数据。请联系管理员。");
      } else {
        // next-auth automatically convert all email addresses to lower case.
        const lower = email.toLowerCase();
        await router.push(`/api/auth/callback/sendgrid?` +
          `${callbackUrlParam(callbackUrl)}` +
          `&token=${token}&email=${encodeURIComponent(lower)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <>
    <Heading size="md" marginBottom={10}>输入验证码</Heading>

    <HStack>
      <PinInput otp onComplete={submit} size="lg" autoFocus>
        <PinInputField />
        <PinInputField />
        <PinInputField />
        <PinInputField />
        <PinInputField />
        <PinInputField />
      </PinInput>
    </HStack>

    <Text>{' '}</Text>
    <Text>验证码已发至 <b>{email}</b>。若未收到邮件，请核对邮箱地址、检查垃圾收件箱，{
      }或者返回上一页重试。</Text>
    <Text><Link as={NextLink} href="/">返回重试</Link></Text>

    {/* For some reason `opacity=0` doesn't work */}
    <Loader {...!isLoading && { color: "white" }} />
  </>;
}
