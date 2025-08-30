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
} from "@chakra-ui/react";
import { useState } from "react";
import useMe from "../useMe";
import trpc, { trpcNext } from "../trpc";
import ModalWithBackdrop from "./ModalWithBackdrop";
import { isValidChineseCellNumber, isValidChineseName } from "shared/strings";
import { signOut, useSession } from "next-auth/react";
import { canAcceptMergeToken } from "shared/merge";
import { MergeModals } from "./MergeModals";
import { DateColumn } from "shared/DateColumn";
import { PearlStudentModals } from "./PearlStudentModals";
import { canValidatePearlStudent } from "shared/pearlStudent";
import {
  cellRequiredButNotProvided,
  cellTokenMinSendIntervalInSeconds,
} from "shared/User";

export default function PostLoginModels() {
  const me = useMe();
  const { data: state, refetch } = trpcNext.users.getUserState.useQuery();

  return state === undefined ? (
    <></>
  ) : !isConsented(state.consentedAt) ? (
    <ConsentModal refetch={refetch} />
  ) : canAcceptMergeToken(me.email) && !state?.declinedMergeModal ? (
    <MergeModals userState={state} refetchUserState={refetch} />
  ) : !me.name ? (
    <SetNameModal />
  ) : me.cell === null || me.cell === cellRequiredButNotProvided ? (
    <SetCellModal />
  ) : canValidatePearlStudent(me.roles) && !state?.declinedPearlStudentModal ? (
    // Ask for pearl student info only if user has no roles.
    <PearlStudentModals userState={state} refetchUserState={refetch} />
  ) : (
    <></>
  );
}

function SetCellModal() {
  const me = useMe();
  const { update } = useSession();
  const required = me.cell === cellRequiredButNotProvided;
  const [cell, setCell] = useState(required ? "" : me.cell || "");
  const [token, setToken] = useState("");
  const [countdown, setCountdown] = useState(0);

  const sendToken = async () => {
    await trpc.users.sendCellToken.mutate({ cell });
    setCountdown(cellTokenMinSendIntervalInSeconds);

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
  };

  const submit = async () => {
    await trpc.users.setCell.mutate({ cell, token });
    await update();
  };

  const isValidCell = isValidChineseCellNumber(cell);
  const isValidInput = isValidCell && token;

  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>手机号验证</ModalHeader>
        <ModalBody>
          <Box mt={4}>
            <FormControl>
              <FormLabel>请填写手机号</FormLabel>
              <Input
                isRequired={true}
                value={cell}
                onChange={(e) => setCell(e.target.value)}
                placeholder="仅支持中国大陆手机号"
                mb="24px"
              />
              <FormControl>
                <InputGroup size="md">
                  <Input
                    isRequired={true}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    isDisabled={!isValidCell}
                    mb="24px"
                  />
                  <InputRightElement w="120px">
                    <Button
                      w="120px"
                      isDisabled={!isValidCell || countdown > 0}
                      onClick={sendToken}
                    >
                      {countdown > 0 ? `${countdown}秒后重发` : "发送验证码"}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
            </FormControl>
          </Box>
        </ModalBody>
        <ModalFooter>
          <HStack w="100%">
            {!required && (
              <>
                <Button>我没有中国大陆手机号，跳过此步</Button>
                <Spacer />
              </>
            )}
            <Button
              colorScheme="blue"
              isDisabled={!isValidInput}
              onClick={submit}
              {...(required ? { w: "100%" } : {})}
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
