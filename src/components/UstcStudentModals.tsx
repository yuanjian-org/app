import IdTokenInputs from "./IdTokenInputs";
import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  HStack,
  ModalCloseButton,
  VStack,
  Spacer,
  Link,
  Text,
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
        <ModalHeader>科大学生邮箱验证</ModalHeader>
        <ModalBody>
          <Text>
            本站的【导师预约】页面仅限中国科学技术大学的学生。您有科大学生邮箱吗？
          </Text>
          <Text mt={componentSpacing}>
            如果选择跳过，之后可以前往用户菜单的【
            {accountPageTitle}
            】页进行验证。
          </Text>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <Button onClick={decline}>我没有科大学生邮箱，或跳过此步</Button>
            <Spacer />
            <Button variant="brand" onClick={confirm}>
              我有科大学生邮箱
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
  const [email, setEmail] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean>(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const { update } = useSession();

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
        <ModalHeader>科大学生邮箱验证</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={componentSpacing} align="stretch">
            <SmallGrayText>所有字段均为必填：</SmallGrayText>
            <IdTokenInputs
              idType="email"
              onStateChange={(state) => {
                setEmail(state.id);
                setToken(state.token);
                setIsInputValid(
                  state.isValid && state.id.endsWith("@mail.ustc.edu.cn"),
                );
              }}
            />
            {!isInputValid && email && !email.endsWith("@mail.ustc.edu.cn") && (
              <Text color="red.500" fontSize="sm">
                必须是以 @mail.ustc.edu.cn 结尾的邮箱地址
              </Text>
            )}
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
