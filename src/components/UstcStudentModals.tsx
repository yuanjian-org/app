import T from "components/T";
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
    <ModalWithBackdrop isOpen size="lg" onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>
          <T>科大学生邮箱验证</T>
        </ModalHeader>
        <ModalBody>
          <Text>
            本站的【导师预约】页面仅限中国科学技术大学的学生。您有科大学生邮箱吗？
          </Text>
          <Text mt={componentSpacing}>
            <T>如果选择跳过，之后可以前往用户菜单的【</T>
            {accountPageTitle}
            <T>】页进行验证。</T>
          </Text>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <Button onClick={decline}>
              <T>我没有科大学生邮箱，或跳过此步</T>
            </Button>
            <Spacer />
            <Button variant="brand" onClick={confirm}>
              <T>我有科大学生邮箱</T>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

/**
 * TODO: Reuse <IdTokenInputs />
 */
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
  const domain = "@mail.ustc.edu.cn";
  const email = emailPrefix.trim() + domain;
  const isEmailPrefixValid = emailPrefix.trim().length > 0;
  const isInputValid =
    isEmailPrefixValid && token.trim().length === tokenLength;
  const buttonWidth = "120px";
  const sendToken = async () => {
    setLoadingToken(true);
    try {
      await trpc.idTokens.send.mutate({
        idType: "email",
        id: email,
      });
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
        <ModalHeader>
          <T>科大学生邮箱验证</T>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={componentSpacing} align="stretch">
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
              <T>如有问题，</T>
              <Link
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                isExternal
              >
                <T>联系客服</T>
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
              <T>提交</T>
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
