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
  HStack,
  Link,
} from "@chakra-ui/react";
import { useState } from "react";
import useMe from "../useMe";
import trpc, { trpcNext } from "../trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { isValidChineseName } from "shared/strings";
import { useSession } from "next-auth/react";
import { signOut } from "./signOut";
import { DateColumn } from "shared/DateColumn";
import { PearlStudentModals } from "./PearlStudentModals";
import { SmallGrayText } from "./SmallGrayText";
import { componentSpacing } from "theme/metrics";
import { RiCustomerServiceFill } from "react-icons/ri";
import { staticUrlPrefix } from "static";
import IdTokenInputs, { IdTokenInputsState } from "./IdTokenInputs";
import invariant from "shared/invariant";
import { useCanValidatePearlStudent } from "./useCanValidatePearlStudent";
import { useCanValidateUstcStudent } from "./useCanValidateUstcStudent";
import { UstcStudentModals } from "./UstcStudentModals";
import {
  MenteeProfileModal,
  isMenteeProfileComplete,
} from "./MenteeProfileModals";
import { features } from "shared/Features";
import { isPermitted } from "shared/Role";

// prettier-ignore
export default function PostLoginModels() {
  const me = useMe();
  const { data: state, refetch } = trpcNext.users.getUserState.useQuery();
  const canValidatePearlStudent = useCanValidatePearlStudent(me.roles);
  const canValidateUstcStudent = useCanValidateUstcStudent(me.email);
  const { data: profileData, isFetched: isProfileFetched } = trpcNext.users.getUserProfile.useQuery({ userId: me.id });


  return state === undefined ? (
    <></>

  ) : !isConsented(state.consentedAt) ? (
    <ConsentModal refetch={refetch} />

    // Ask for phone number first because this step may cause the current user to
    // be merged with another user. Information required later (name, phone,
    // roles, etc) may have been already filled in the merged account.
  ) : me.phone === null ? (
    <SetPhoneModal cancel={signOut} cancelLabel="退出登录" />

    // Validate pearl student before setting name because the former also sets
    // name.
  ) : canValidatePearlStudent && !state?.declinedPearlStudentModal ? (
    <PearlStudentModals userState={state} refetchUserState={refetch} />

  ) : canValidateUstcStudent && !state?.declinedUstcStudentModal ? (
    <UstcStudentModals userState={state} refetchUserState={refetch} />

  ) : !me.name ? (
    <SetNameModal />

  ) : isProfileFetched
  && features.menteeProfile
  && isPermitted(me.roles, "Mentee")
  && !isMenteeProfileComplete(profileData?.profile) 
  && !state?.declinedMenteeProfileModal 
  ? (
    <MenteeProfileModal 
      userState={state} 
      refetchUserState={refetch} 
      cancelLabel="稍后再说，跳过此步" 
    />
  ) : (
    <></>
  );
}

const buttonWidth = "120px";

export function SetEmailModal({ cancel }: { cancel: () => void }) {
  const { update } = useSession();
  const [state, setState] = useState<IdTokenInputsState>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    invariant(state?.isValid, "state is invalid");
    setLoading(true);
    try {
      await trpc.idTokens.setEmail.mutate({
        email: state.id,
        token: state.token,
      });

      // As soon as the session is updated, all affected page components should
      // be refreshed including the caller to this modal, so we don't need to
      // manually close this modal.
      await update();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWithBackdrop isOpen onClose={cancel}>
      <ModalContent>
        <ModalHeader>邮箱验证</ModalHeader>
        <ModalBody>
          <VStack spacing={componentSpacing} w="full">
            <IdTokenInputs
              idType="email"
              onStateChange={setState}
              buttonWidth={buttonWidth}
            />
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
            <Button onClick={cancel} isDisabled={loading}>
              取消
            </Button>
            <Button
              onClick={submit}
              variant="brand"
              isDisabled={!state?.isValid}
              isLoading={loading}
            >
              提交
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
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
  const [state, setState] = useState<IdTokenInputsState>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    invariant(state?.isValid, "state is invalid");
    setLoading(true);
    try {
      await trpc.idTokens.setPhone.mutate({
        phone: state.id,
        token: state.token,
      });

      // As soon as the session is updated, all affected page components should
      // be refreshed including the caller to this modal, so we don't need to
      // manually close this modal.
      await update();
    } finally {
      setLoading(false);
    }
  };

  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>手机号验证</ModalHeader>
        <ModalBody>
          <VStack spacing={componentSpacing} w="full">
            <IdTokenInputs
              idType="phone"
              onStateChange={setState}
              buttonWidth={buttonWidth}
            />

            <HStack spacing={2} w="full">
              <SmallGrayText>
                <Link
                  href={`https://yuantuapp.com${staticUrlPrefix}/why-phone`}
                  isExternal
                >
                  为什么要填手机号？
                </Link>
              </SmallGrayText>
              <Spacer />
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
              isDisabled={!state?.isValid}
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
  const [loading, setLoading] = useState<boolean>(false);

  const submit = async () => {
    setLoading(true);
    try {
      await trpc.users.setMyState.mutate({
        consentedAt: new Date().toISOString(),
      });
      refetch();
    } finally {
      setLoading(false);
    }
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
            <Button variant="brand" onClick={submit} isLoading={loading}>
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
