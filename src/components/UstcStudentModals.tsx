import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  HStack,
  ModalCloseButton,
  FormControl,
  Input,
  VStack,
  Spacer,
  Link,
  Text,
  InputGroup,
  InputRightAddon,
  InputRightElement,
} from "@chakra-ui/react";
import { useState } from "react";
import trpc from "../trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { componentSpacing } from "theme/metrics";
import { UserState } from "shared/UserState";
import { toast } from "react-toastify";
import { accountPageTitle } from "pages/accounts/[userId]";
import { useSession } from "next-auth/react";
import { SmallGrayText } from "./SmallGrayText";
import { RiCustomerServiceFill } from "react-icons/ri";
import { tokenMinSendIntervalInSeconds, tokenLength } from "shared/token";

export function UstcStudentModals({
  userState,
  refetchUserState,
}: {
  userState: UserState | null;
  refetchUserState: () => void;
}) {
  const [isInitial, setIsInitial] = useState<boolean>(true);

  const decline = async () => {
    await trpc.users.setMyState.mutate({
      ...userState,
      declinedUstcStudentModal: true,
    });
    refetchUserState();
  };

  return isInitial ? (
    <InitialModal confirm={() => setIsInitial(false)} decline={decline} />
  ) : (
    <UstcStudentValidationModal
      cancelLabel="返回"
      cancel={() => setIsInitial(true)}
    />
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
        <ModalHeader>中科大学生验证</ModalHeader>
        <ModalBody>
          <Text>您是正在中国科学技术大学就读的学生吗？</Text>
          <Text mt={componentSpacing}>
            如果选择跳过，之后可以前往用户菜单的【
            {accountPageTitle}
            】页进行验证。
          </Text>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <Button onClick={decline}>我不是中科大学生，或跳过此步</Button>
            <Spacer />
            <Button variant="brand" onClick={confirm}>
              我是中科大学生
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

export function UstcStudentValidationModal({
  cancelLabel,
  cancel,
}: {
  cancelLabel: string;
  cancel: () => void;
}) {
  const [emailPrefix, setEmailPrefix] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [countdown, setCountdown] = useState(0);
  const [loadingToken, setLoadingToken] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const { update } = useSession();

  const domain = "@ustc.edu.cn";
  const email = emailPrefix.trim() + domain;
  const isEmailPrefixValid = emailPrefix.trim().length > 0;
  const isInputValid =
    isEmailPrefixValid && token.trim().length === tokenLength;
  const buttonWidth = "120px";

  const sendToken = async () => {
    setLoadingToken(true);
    try {
      await trpc.idTokens.send.mutate({ idType: "email", id: email });
      toast.success("验证码已发送，请注意查收。");

      setCountdown(tokenMinSendIntervalInSeconds);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setLoadingToken(false);
    }
  };

  const submit = async () => {
    setLoadingSubmit(true);
    try {
      await trpc.ustcStudents.validate.mutate({
        email,
        token: token.trim(),
      });

      // As soon as the session is updated, all affected page components should
      // be refreshed including the caller to UstcStudentModals, so we don't need
      // to manually close this modal.
      await update();

      toast.success(`验证成功。您现在可以享受专属功能了。`);
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <ModalWithBackdrop isOpen size="lg" onClose={cancel}>
      <ModalContent>
        <ModalHeader>中科大学生验证</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={componentSpacing} align="stretch">
            <SmallGrayText>请填写您的中科大校友邮箱获取验证码：</SmallGrayText>
            <FormControl>
              <InputGroup>
                <Input
                  autoFocus
                  placeholder="邮箱前缀"
                  value={emailPrefix}
                  onChange={(e) => setEmailPrefix(e.target.value)}
                />
                <InputRightAddon>{domain}</InputRightAddon>
              </InputGroup>
            </FormControl>

            <FormControl>
              <InputGroup>
                <Input
                  isRequired={true}
                  placeholder="验证码"
                  value={token}
                  isDisabled={!isEmailPrefixValid}
                  onChange={(e) => setToken(e.target.value)}
                />
                <InputRightElement w={buttonWidth}>
                  <Button
                    w={buttonWidth}
                    isDisabled={!isEmailPrefixValid || countdown > 0}
                    onClick={sendToken}
                    isLoading={loadingToken}
                  >
                    {countdown > 0 ? `${countdown}秒后重发` : "发送验证码"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <SmallGrayText>
              如有问题，
              <Link
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                isExternal
              >
                联系客服
              </Link>
            </SmallGrayText>
            <RiCustomerServiceFill color="gray" />

            <Spacer />
            <Button onClick={cancel} isDisabled={loadingSubmit}>
              {cancelLabel}
            </Button>
            <Button
              onClick={submit}
              variant="brand"
              isDisabled={!isInputValid}
              isLoading={loadingSubmit}
            >
              提交
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
