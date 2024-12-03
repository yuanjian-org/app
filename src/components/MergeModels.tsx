import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  ModalFooter,
  HStack,
  ModalCloseButton,
  PinInput,
  PinInputField,
  Flex,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import trpc from "../trpc";
import ModalWithBackdrop from './ModalWithBackdrop';
import { componentSpacing } from 'theme/metrics';
import { UserState } from 'shared/UserState';
import { longLivedTokenLength } from 'shared/token';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { accountPageTitle } from 'pages/accounts/[userId]';

export function MergeModals({ userState, close }: {
  userState: UserState | null,
  close: () => void
}) {
  const [state, setState] = useState<"Initial" | "EnterToken" | "Declined">(
    "Initial");

  const decline = async () => {
    await trpc.users.setUserState.mutate({
      ...userState,
      declinedMergeModal: true,
    });
    setState("Declined");
  };

  return state === "Initial" ? <InitialMergeModal
    confirm={() => setState("EnterToken")}
    decline={decline}
  />
    : state === "EnterToken" ? <EnterTokenMergeModal
      cancelLabel="返回"
      cancel={() => setState("Initial")}
    />
    : state === "Declined" ? <DeclinedMergeModal close={close} />
    : <></>;
}

export function MergeCodeFormat() {
  return <>
    激活码为九个英文字母，形如：
    <b><code>abc-opq-xyz</code></b>
  </>;
}

function InitialMergeModal({ confirm, decline }: {
  confirm: () => void,
  decline: () => void
}) {
  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>微信激活码</ModalHeader>
        <ModalBody>
          您是否通过电子邮件收到微信激活码？
          <MergeCodeFormat />
        </ModalBody>
        <ModalFooter>
        <HStack spacing={componentSpacing}>
          <Button onClick={decline}>没有收到，跳过</Button>
          <Button variant='brand' onClick={confirm}>输入微信激活码</Button>
        </HStack>
      </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

function DeclinedMergeModal({ close }: {
  close: () => void
}) {
  return (
    <ModalWithBackdrop isOpen onClose={close}>
      <ModalContent>
        <ModalHeader>微信激活码</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          好的。如果您日后需要输入微信激活码，可随时前往用户菜单的“
          {accountPageTitle}
          ”页面进行操作。
        </ModalBody>
        <ModalFooter>
        <HStack spacing={componentSpacing}>
          <Button variant='brand' onClick={close}>知道了</Button>
        </HStack>
      </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

export function EnterTokenMergeModal({ cancelLabel, cancel }: {
  cancelLabel: string,
  cancel: () => void
}) {
  const [token, setToken] = useState<string>("");
  const { update } = useSession();

  const submit = async () => {
    await trpc.merge.merge.mutate({ token });

    // As soon as the session is updated, all affected page components should
    // be refreshed including the caller to MergeModals, so we don't need to
    // manually close this modal.
    const session = await update();

    const email = session?.user.email;
    toast.success(`激活成功。除了使用微信，您现在也可以使用电子邮箱 ${email} 登录了。`);
  };

  return (
    <ModalWithBackdrop isOpen size="lg" onClose={cancel}>
      <ModalContent>
        <ModalHeader>微信激活码</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={componentSpacing}>
            <Text>请输入九个英文字母的微信激活码：</Text>
            <HStack>
              <PinInput
                onChange={v => setToken(v)}
                autoFocus
                type='alphanumeric'
              >
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <Text>―</Text>
                <PinInputField />
                <PinInputField />
                <PinInputField />
                <Text>―</Text>
                <PinInputField />
                <PinInputField />
                <PinInputField />
              </PinInput>
            </HStack>
          </Flex>
        </ModalBody>
        <ModalFooter>
        <HStack spacing={componentSpacing}>
          <Button onClick={cancel}>{cancelLabel}</Button>
          <Button
            onClick={submit}
            variant='brand' isDisabled={token.length !== longLivedTokenLength}
          >
            提交
          </Button>
        </HStack>
      </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
