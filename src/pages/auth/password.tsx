import {
  Button,
  ListItem,
  ModalBody,
  ModalContent,
  ModalFooter, ModalHeader, UnorderedList
} from '@chakra-ui/react';
import { useState } from "react";
import { useRouter } from 'next/router';
import { isValidPassword, parseQueryString, passwordMinLength } from "shared/strings";
import { toast } from 'react-toastify';
import PageBreadcrumb from 'components/PageBreadcrumb';
import { staticUrlPrefix } from 'static';
import { EmailInput, PasswordInput } from './login';
import trpc from 'trpc';
import { SmallGrayText } from 'components/SmallGrayText';
import ModalWithBackdrop from 'components/ModalWithBackdrop';

export default function Page() {
  const router = useRouter();
  const token = parseQueryString(router, "token");
  const email = parseQueryString(router, "email");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessful, setIsSuccessful] = useState(false);

  const submit = async () => {
    if (!token) {
      toast.error("密码重置链接无效。");
      return;
    }

    setIsLoading(true);
    try {
      await trpc.password.reset.mutate({ token, password });
      setIsSuccessful(true);
    } finally {
      setIsLoading(false);
    }
  };

  return <>
    <PageBreadcrumb
      current="设置密码"
      parents={[{ name: "远图", link: staticUrlPrefix }]}
    />

    {email && <EmailInput
      email={email}
      setEmail={() => {}}
      isDisabled
    />}

    <PasswordInput
      password={password}
      setPassword={setPassword}
      isValidInput={isValidPassword(password)}
      submit={submit}
      placeholder="新密码"
      autoFocus
    />

    <SmallGrayText>
      密码长度至少{passwordMinLength}位。强烈建议：
      <UnorderedList>
        <ListItem>
          不要重复使用其他网站或应用的密码。
        </ListItem>
        <ListItem>
          使用密码工具自动生成并保存密码。不要试图记忆。
        </ListItem>
      </UnorderedList>
    </SmallGrayText>

    <Button
      variant="brand"
      isDisabled={!isValidPassword(password)}
      isLoading={isLoading}
      onClick={submit}
    >确认</Button>

    {isSuccessful && <SuccessModal />}
  </>;
}

function SuccessModal() {
  const router = useRouter();

  return <ModalWithBackdrop isOpen onClose={() => {}}>
    <ModalContent>
      <ModalHeader>密码设置成功</ModalHeader>
      <ModalBody>
        即将跳转至登录页面。
      </ModalBody>
      <ModalFooter>
        <Button
          variant="brand"
          onClick={() => router.push("/auth/login")}
        >确认</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}
