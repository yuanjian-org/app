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
  FormLabel,
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
import useMe from "useMe";
import { isValidChineseName } from "shared/strings";
import { useSession } from "next-auth/react";
import { SmallGrayText } from "./SmallGrayText";
import { RiCustomerServiceFill } from "react-icons/ri";

export function PearlStudentModals({
  userState,
  refetchUserState,
}: {
  userState: UserState | null;
  refetchUserState: () => void;
}) {
  const [isInitial, setIsInitial] = useState<boolean>(true);

  const decline = async () => {
    await trpc.users.setUserState.mutate({
      ...userState,
      declinedPearlStudentModal: true,
    });
    refetchUserState();
  };

  return isInitial ? (
    <InitialModal confirm={() => setIsInitial(false)} decline={decline} />
  ) : (
    <PearlStudentValidationModal
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
        <ModalHeader>珍珠生验证</ModalHeader>
        <ModalBody>
          <Text>您是新华爱心教育基金会曾经或正在资助的珍珠生吗？</Text>
          <Text mt={componentSpacing}>
            如果选择跳过，之后可以前往用户菜单的【
            {accountPageTitle}
            】页进行验证。
          </Text>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <Button onClick={decline}>我不是珍珠生，或跳过此步</Button>
            <Spacer />
            <Button variant="brand" onClick={confirm}>
              我是珍珠生
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

export function PearlStudentValidationModal({
  cancelLabel,
  cancel,
}: {
  cancelLabel: string;
  cancel: () => void;
}) {
  const user = useMe();
  const [name, setName] = useState<string>(user.name || "");
  const [pearlId, setPearlId] = useState<string>("");
  const [nationalIdLastFour, setNationalIdLastFour] = useState<string>("");
  const [wechat, setWechat] = useState<string>("");
  const { update } = useSession();

  const isInputValid =
    isValidChineseName(name) &&
    pearlId.length > 0 &&
    nationalIdLastFour.length === 4 &&
    wechat.length > 0;

  const submit = async () => {
    await trpc.pearlStudents.validate.mutate({
      name,
      pearlId,
      nationalIdLastFour,
      wechat,
    });

    // As soon as the session is updated, all affected page components should
    // be refreshed including the caller to PearlStudentModals, so we don't need
    // to manually close this modal.
    await update();

    toast.success(`验证成功。您现在可以享受珍珠生专属功能了。`);
  };

  return (
    <ModalWithBackdrop isOpen size="lg" onClose={cancel}>
      <ModalContent>
        <ModalHeader>珍珠生验证</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={componentSpacing} align="stretch">
            <SmallGrayText>所有字段为必填：</SmallGrayText>
            <FormControl>
              <FormLabel>姓名</FormLabel>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>珍珠生号（一般为11个字符）</FormLabel>
              <Input
                value={pearlId}
                onChange={(e) => setPearlId(e.target.value)}
              />
            </FormControl>

            <FormControl>
              <FormLabel>身份证号最后四位</FormLabel>
              <Input
                value={nationalIdLastFour}
                onChange={(e) => setNationalIdLastFour(e.target.value)}
                maxLength={4}
              />
            </FormControl>

            <FormControl>
              <FormLabel>微信号</FormLabel>
              <Input
                value={wechat}
                onChange={(e) => setWechat(e.target.value)}
              />
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={componentSpacing} w="full">
            <SmallGrayText>
              若有问题，
              <Link
                href="https://work.weixin.qq.com/kfid/kfcd32727f0d352531e"
                target="_blank"
              >
                联系客服
              </Link>
            </SmallGrayText>
            <RiCustomerServiceFill color="gray" />

            <Spacer />
            <Button onClick={cancel}>{cancelLabel}</Button>
            <Button onClick={submit} variant="brand" isDisabled={!isInputValid}>
              提交
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}
