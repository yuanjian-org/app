import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  VStack,
  ModalFooter,
  Spacer,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { useUserContext } from "../UserContext";
import trpc from "../trpc";
import User from '../shared/User';
import ModalWithBackdrop from './ModalWithBackdrop';

const consentContentLastUpdatedAt = new Date("2023-06-01");

export function consentFormAccepted(user: User) {
  return user.consentFormAcceptedAt && (
    new Date(user.consentFormAcceptedAt).getTime() >= consentContentLastUpdatedAt.getTime()
  );
}

export default function ConsentModal() {
  const [user, setUser] = useUserContext();
  const [declined, setDeclined] = useState<boolean>(false);

  const handleSubmit = async () => {
    const updated = structuredClone(user);
    updated.consentFormAcceptedAt = new Date().toISOString();
    await trpc.users.update.mutate(updated);
    setUser(updated);
  };

  return <>
    {/* onClose returns undefined to prevent user from closing the modal without entering name. */}
    <ModalWithBackdrop isOpen={!declined} onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>在继续之前，请阅读以下声明：</ModalHeader>
        <ModalBody>
          <VStack spacing={6} marginBottom={10} align='left'>
            <Text>为确保个人隐私，社会导师服务平台严格限制转录文字和摘要的访问权限。只有用户
              本人和少量已签署保密协议的平台工作人员能够访问这些数据。在【谁能看到我的数据】
              页，您可以查看所有授权人员的名单。</Text>

            <Text>平台绝对不会把上述数据提供给任何第三方。</Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setDeclined(true)}>拒绝使用</Button>
          <Spacer />
          <Button variant='brand' onClick={handleSubmit}>已阅，同意使用本网站</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>

    <ModalWithBackdrop isOpen={declined} onClose={() => undefined}>
      <ModalContent>
        <ModalHeader> </ModalHeader>
        <ModalBody>
          <Text>您已拒绝继续使用，请关闭浏览器窗口。</Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setDeclined(false)}>重新选择</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  </>;
}
