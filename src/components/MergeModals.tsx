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
} from "@chakra-ui/react";
import { useState } from "react";
import trpc from "../trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { breakpoint, componentSpacing } from "theme/metrics";
import { UserState } from "shared/UserState";
import { longLivedTokenLength } from "shared/token";
import { useSession } from "next-auth/react";
import { toast } from "react-toastify";
import { accountPageTitle } from "pages/accounts/[userId]";
import _ from "lodash";

export function MergeModals({
  userState,
  refetchUserState,
}: {
  userState: UserState | null;
  refetchUserState: () => void;
}) {
  const [state, setState] = useState<"Initial" | "Input" | "Declined">(
    "Initial",
  );

  const decline = async () => {
    await trpc.users.setUserState.mutate({
      ...userState,
      declinedMergeModal: true,
    });
    setState("Declined");
  };

  return state === "Initial" ? (
    <InitialModal confirm={() => setState("Input")} decline={decline} />
  ) : state === "Input" ? (
    <InputMergeTokenModal
      cancelLabel="返回"
      cancel={() => setState("Initial")}
    />
  ) : state === "Declined" ? (
    <DeclinedModal close={refetchUserState} />
  ) : (
    <></>
  );
}

export function MergeTokenFormat() {
  return (
    <>
      激活码为九个英文字母，形如：
      <b>
        <code>ABCDEFGHI</code>
      </b>
    </>
  );
}

function InitialModal({
  confirm,
  decline,
}: {
  confirm: () => void;
  decline: () => void;
}) {
  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>微信激活码</ModalHeader>
        <ModalBody>
          您是否已经收到微信激活码？
          <MergeTokenFormat />
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing}>
            <Button onClick={decline}>没有收到，跳过此步</Button>
            <Button variant="brand" onClick={confirm}>
              输入微信激活码
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

function DeclinedModal({ close }: { close: () => void }) {
  return (
    <ModalWithBackdrop isOpen onClose={close}>
      <ModalContent>
        <ModalHeader>微信激活码</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          如果您日后需要输入微信激活码，可随时前往用户菜单的【
          {accountPageTitle}
          】页面进行操作。
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing}>
            <Button variant="brand" onClick={close}>
              知道了
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

export function InputMergeTokenModal({
  cancelLabel,
  cancel,
}: {
  cancelLabel: string;
  cancel: () => void;
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
    toast.success(
      `激活成功。除了使用微信，您现在也可以使用电子邮箱 ${email} 登录了。`,
    );
  };

  return (
    <ModalWithBackdrop isOpen size="lg" onClose={cancel}>
      <ModalContent>
        <ModalHeader>微信激活码</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex direction="column" gap={componentSpacing} alignItems="center">
            <Text>请输入九个英文字母的微信激活码，大小写不敏感：</Text>
            <HStack>
              <PinInput
                size={{ base: "sm", [breakpoint]: "md" }}
                onChange={(v) => setToken(v)}
                autoFocus
                type="alphanumeric"
              >
                {_.times(longLivedTokenLength, (i) => (
                  <PinInputField key={i} />
                ))}
              </PinInput>
            </HStack>
          </Flex>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing}>
            <Button onClick={cancel}>{cancelLabel}</Button>
            <Button
              onClick={submit}
              variant="brand"
              isDisabled={token.length !== longLivedTokenLength}
            >
              提交
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
