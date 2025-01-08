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
} from '@chakra-ui/react';
import { useState } from 'react';
import useMe from "../useMe";
import trpc, { trpcNext } from "../trpc";
import ModalWithBackdrop from './ModalWithBackdrop';
import { isValidChineseName } from 'shared/strings';
import { signOut, useSession } from 'next-auth/react';
import { canAcceptMergeToken } from 'shared/merge';
import { MergeModals } from './MergeModals';
import { DateColumn } from 'shared/DateColumn';

export default function PostLoginModels() {
  const me = useMe();
  const { data: state, refetch } = trpcNext.users.getUserState.useQuery();

  return state === undefined ?
    <></>
    : !me.name ?
      <SetNameModal />
      : !isConsented(state.consentedAt) ?
        <ConsentModal refetch={refetch} />
        : canAcceptMergeToken(me.email) && !state?.declinedMergeModal ?
          <MergeModals userState={state} close={refetch} />
          : <></>;
}

function SetNameModal() {
  const me = useMe();
  const { update } = useSession();
  const [name, setName] = useState(me.name || '');
  const submit = async () => {
    if (name) {
      const updated = {
        ...me,
        name,
      };
      await trpc.users.update.mutate(updated);
      await update();
    };
  };

  return (
    // Set onClose to undefined to prevent user from closing the modal without
    // entering name.
    <ModalWithBackdrop isOpen onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>欢迎你，新用户 👋</ModalHeader>
        <ModalBody>
          <Box mt={4}>
            <FormControl>
              <FormLabel>请填写中文全名</FormLabel>
              <Input
                isRequired={true}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='请勿使用英文或其他符号'
                mb='24px'
              />
              <Button
                onClick={submit}
                isDisabled={!isValidChineseName(name)}
                variant='brand' w='100%' mb='24px'>
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

  return consentedAt && new Date(consentedAt).getTime() >=
    consentTextLastUpdatedAt.getTime();
}

function ConsentModal({ refetch }: { refetch: () => void }) {
  const [declined, setDeclined] = useState<boolean>(false);

  const submit = async () => {
    await trpc.users.setUserState.mutate({
      consentedAt: new Date().toISOString(),
    });
    refetch();
  };

  return <>
    {/* onClose returns undefined to prevent user from closing the modal without
        entering name. */}
    <ModalWithBackdrop isOpen={!declined} onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>在继续之前，请阅读以下声明：</ModalHeader>
        <ModalBody>
          <VStack spacing={6} marginBottom={10} align='left'>
            <Text>为确保个人隐私，社会导师服务平台严格限制自动会议既要的访问权限。只有用{
              }户本人和少量已签署保密协议的平台工作人员能够访问这些数据。在【谁能看到我的数{
              }据】页，您可以查看所有授权人员的名单。</Text>

            <Text>本平台在未经用户许可的情况下，不会将上述数据提供给任何第三方。</Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setDeclined(true)}>拒绝使用</Button>
          <Spacer />
          <Button variant='brand' onClick={submit}>已阅，同意使用本网站</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>

    <ModalWithBackdrop isOpen={declined} onClose={() => undefined}>
      <ModalContent>
        <ModalHeader> </ModalHeader>
        <ModalBody>
          <Text>您已拒绝继续使用，请退出登录。</Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => signOut()}>退出登录</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  </>;
}
