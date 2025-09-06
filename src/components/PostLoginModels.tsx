import {
  Button,
  Box,
  FormControl,
  FormLabel,
  Input,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  VStack,
  ModalFooter,
  Spacer,
  InputGroup,
  InputRightElement,
  HStack,
  Link,
} from "@chakra-ui/react";
import { useState } from "react";
import useMe from "../useMe";
import trpc, { trpcNext } from "../trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { isValidPhoneNumber, isValidChineseName } from "shared/strings";
import { signOut, useSession } from "next-auth/react";
import { canAcceptMergeToken } from "shared/merge";
import { MergeModals } from "./MergeModals";
import { DateColumn } from "shared/DateColumn";
import { PearlStudentModals } from "./PearlStudentModals";
import { canValidatePearlStudent } from "shared/pearlStudent";
import { phoneTokenMinSendIntervalInSeconds } from "shared/token";
import { SmallGrayText } from "./SmallGrayText";
import { componentSpacing } from "theme/metrics";
import { RiCustomerServiceFill } from "react-icons/ri";
import PhoneNumberInput from "./PhoneNumberInput";
import { staticUrlPrefix } from "static";

// prettier-ignore
export default function PostLoginModels() {
  const me = useMe();
  const { data: state, refetch } = trpcNext.users.getUserState.useQuery();

  return state === undefined ? (
    <></>

  // Ask for phone number first because this step may cause the current user to
  // be merged with another user. Information required later (name, cell,
  // roles, etc) may have been already filled in the merged account.
  ) : me.phone === null ? (
    <SetPhoneModal cancel={signOut} cancelLabel="退出登录" />

  ) : canAcceptMergeToken(me.email) && !state?.declinedMergeModal ? (
    <MergeModals userState={state} refetchUserState={refetch} />

  ) : !isConsented(state.consentedAt) ? (
    <ConsentModal refetch={refetch} />

  // Validate pearl student before setting name because the former also sets 
  // name. Do it before setting cell because the system will require cell for
  // all pearl students.
  ) : canValidatePearlStudent(me.roles) && !state?.declinedPearlStudentModal ? (
    <PearlStudentModals userState={state} refetchUserState={refetch} />

  ) : !me.name ? (
    <SetNameModal />

  ) : (
    <></>
  );
}

export function SetPhoneModal({
  cancel,
  cancelLabel,
}: {
  cancel: () => void;
  cancelLabel: string;
}) {
  const { update } = useSession();
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);

  const sendToken = async () => {
    setLoading(true);
    try {
      await trpc.phones.sendVerificationToken.mutate({ phone });
      setCountdown(phoneTokenMinSendIntervalInSeconds);

      // Start countdown timer
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
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    try {
      await trpc.phones.set.mutate({ phone, token });

      // As soon as the session is updated, all affected page components should
      // be refreshed including the caller to this modal, so we don't need to
      // manually close this modal.
      await update();
    } finally {
      setLoading(false);
    }
  };

  const isValidPhone = isValidPhoneNumber(phone);
  const isValidInput = isValidPhone && token;

  console.log("phone", phone);
  console.log("isValidPhone", isValidPhone);

  const buttonWidth = "120px";

  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>手机号验证</ModalHeader>
        <ModalBody>
          <VStack spacing={componentSpacing} w="full">
            <FormControl>
              <FormLabel>请填写手机号</FormLabel>
              <PhoneNumberInput value={phone} onChange={setPhone} />
            </FormControl>
            <FormControl>
              <InputGroup>
                <Input
                  isRequired={true}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  isDisabled={!isValidPhone}
                />
                <InputRightElement w={buttonWidth}>
                  <Button
                    w={buttonWidth}
                    isDisabled={!isValidPhone || countdown > 0}
                    onClick={sendToken}
                    isLoading={loading}
                  >
                    {countdown > 0 ? `${countdown}秒后重发` : "发送验证码"}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <HStack spacing={2} w="full">
              <SmallGrayText>
                <Link href={`${staticUrlPrefix}/why-phone`} target="_blank">
                  为什么要填手机号？
                </Link>
              </SmallGrayText>
              <Spacer />
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
            </HStack>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack w="full">
            <Button onClick={cancel} w={buttonWidth}>
              {cancelLabel}
            </Button>
            <Spacer />
            <Button
              variant="brand"
              w={buttonWidth}
              isDisabled={!isValidInput}
              onClick={submit}
              isLoading={loading}
            >
              确认
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

function SetNameModal() {
  const me = useMe();
  const { update } = useSession();
  const [name, setName] = useState(me.name || "");
  const submit = async () => {
    if (name) {
      const updated = {
        ...me,
        name,
      };
      await trpc.users.update.mutate(updated);
      await update();
    }
  };

  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>你好，新用户 👋</ModalHeader>
        <ModalBody>
          <Box mt={4}>
            <FormControl>
              <FormLabel>请填写中文全名</FormLabel>
              <Input
                isRequired={true}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请勿使用英文或其他符号"
                mb="24px"
              />
              <Button
                onClick={submit}
                isDisabled={!isValidChineseName(name)}
                variant="brand"
                w="100%"
                mb="24px"
              >
                提交
              </Button>
            </FormControl>
          </Box>
        </ModalBody>
      </ModalContent>
    </ModalWithBackdrop>
  );
}

function isConsented(consentedAt: DateColumn | undefined) {
  const consentTextLastUpdatedAt = new Date("2023-06-01");

  return (
    consentedAt &&
    new Date(consentedAt).getTime() >= consentTextLastUpdatedAt.getTime()
  );
}

export function ConsentText() {
  return (
    <>
      <Text>
        为确保个人隐私，远图社会导师服务平台严格限制用户数据的访问权限。只有用{}
        户本人和少量已签署保密协议的平台工作人员能够访问这些数据。通过【用户菜单】›
        {}【账号与安全】›【谁能看到我的数据】，您可以查看所有授权人员的名单。
      </Text>

      <Text>
        本平台在未经用户许可的情况下，不会将用户数据提供给任何第三方。
      </Text>
    </>
  );
}

function ConsentModal({ refetch }: { refetch: () => void }) {
  const [declined, setDeclined] = useState<boolean>(false);

  const submit = async () => {
    await trpc.users.setUserState.mutate({
      consentedAt: new Date().toISOString(),
    });
    refetch();
  };

  return (
    <>
      {/* onClose returns undefined to prevent user from closing the modal
        without entering name. */}
      <ModalWithBackdrop isOpen={!declined} onClose={() => undefined}>
        <ModalContent>
          <ModalHeader>在继续之前，请阅读以下声明：</ModalHeader>
          <ModalBody>
            <VStack spacing={6} marginBottom={10} align="left">
              <ConsentText />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setDeclined(true)}>拒绝使用</Button>
            <Spacer />
            <Button variant="brand" onClick={submit}>
              已阅，同意使用本网站
            </Button>
          </ModalFooter>
        </ModalContent>
      </ModalWithBackdrop>

      <ModalWithBackdrop isOpen={declined} onClose={() => undefined}>
        <ModalContent>
          <ModalHeader />
          <ModalBody>
            <Text>您已拒绝继续使用，请退出登录。</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => signOut()}>退出登录</Button>
          </ModalFooter>
        </ModalContent>
      </ModalWithBackdrop>
    </>
  );
}
