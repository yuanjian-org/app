import {
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  VStack,
  ModalFooter,
  Link,
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
    const updatedUser = structuredClone(user);
    updatedUser.consentFormAcceptedAt = new Date();
    await trpc.users.update.mutate(updatedUser);
    setUser(updatedUser);
  };

  return <>
    {/* onClose returns undefined to prevent user from closing the modal without entering name. */}
    <ModalWithBackdrop isOpen={!declined} onClose={() => undefined}>
      <ModalContent>
        <ModalHeader>在继续之前，请阅读以下声明：</ModalHeader>
        <ModalBody>
          <VStack spacing={6} marginBottom={10} align='left'>
            <Text>本网站是<Link isExternal href="http://yuanjian.org">远见教育基金会</Link>（远见）下属的“远图”教育平台内部测试版。
              为了测试自动会议摘要的质量，<b>在内测期间，网站会自动将会议全程转录成文字、生成会议摘要、并保存这些文字和摘要</b>。</Text>

            <Text>为确保个人隐私，远见严格限制转录文字和摘要的访问权限。只有用户本人和少量已签署保密协议的远见工作人员能够访问这些数据。
              在【谁能看到我的数据】页，您可以查看所有授权人员的名单。</Text>

            <Text>远见绝对不会把上述数据提供给任何第三方。</Text>
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
