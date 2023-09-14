import { Link, Text, HStack, PinInput, PinInputField } from '@chakra-ui/react';
import AuthPageContainer from 'components/AuthPageContainer';
import Loader from 'components/Loader';
import NextLink from "next/link";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { localStorageKeyForLoginCallbackUrl, localStorageKeyForLoginEmail } from './login';

export default function VerifyRequest() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const submit = async (token: string) => {
    setIsLoading(true);
    try {
      const email = localStorage.getItem(localStorageKeyForLoginEmail);
      const callbackUrl = localStorage.getItem(localStorageKeyForLoginCallbackUrl);
    
      if (!email || !callbackUrl) {
        console.error("Email or callbackUrl absent from local storage");
        toast.error("糟糕，无法读取浏览器数据。请联系管理员。");
      } else {
        router.push(`/api/auth/callback/sendgrid?` +
          `callbackUrl=${encodeURIComponent(callbackUrl)}&token=${token}&email=${encodeURIComponent(email)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return <AuthPageContainer title="输入验证码">
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
    <Text>您应该已经收到了一封带有验证码的邮件。否则请检查垃圾邮箱，或者返回上一页重试。</Text>
    <Text><Link as={NextLink} href="/">返回重试</Link></Text>

    {/* For some reason `opacity=0` doesn't work */}
    <Loader {...!isLoading && { color: "white" }} />
  </AuthPageContainer>;
}
