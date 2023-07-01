import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Text,
  VStack,
  ModalFooter,
  Link,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import useUserContext from "../useUserContext";
import tClientBrowser from "../tClientBrowser";
import { toast } from "react-toastify";
import moment from 'moment';
import UserProfile from '../shared/UserProfile';

export function consentFormAccepted(user: UserProfile) {
  return user.consentFormAcceptedAt && moment(user.consentFormAcceptedAt) >= moment("20111031", "YYYYMMDD");
}

export default function ConsentModal() {
  const [user, setUser] = useUserContext();
  const [declined, setDeclined] = useState<boolean>(false);

  const handleSubmit = async () => {
    const updatedUser = structuredClone(user);
    updatedUser.consentFormAcceptedAt = new Date();

    // TODO: Handle error display globally. Redact server-side errors.
    try {
      await tClientBrowser.me.updateProfile.mutate(updatedUser);
      setUser(updatedUser);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const MyLink = (props: any) => <Link isExternal color='teal.500' {...props} />;

  return <>
    {/* onClose returns undefined to prevent user from closing the modal without entering name. */}
    <Modal isOpen={!declined} onClose={() => undefined}>
      <ModalOverlay backdropFilter='blur(8px)' />
      <ModalContent>
        <ModalHeader>在继续之前，请阅读以下声明：</ModalHeader>
        <ModalBody>
          <VStack spacing={6} marginBottom={10} align='left'>
            <Text>本网站是远见教育基金会（远见）教育平台的内测版。为了测试自动会议摘要的质量，<b>在内测期间，网站会自动保存完整的会议转录文字和摘要</b>。</Text>

            <Text>为确保个人隐私，远见严格限制转录文字和摘要的访问。只有用户本人和少量已签署保密协议的远见工作人员能够访问这些数据。</Text>

            <Text>远见绝对不会把会议记录或摘要提供给任何第三方。</Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant='ghost' onClick={() => setDeclined(true)}>拒绝使用</Button>
          <Button variant='brand' onClick={handleSubmit}>已阅，同意使用本网站</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>

    <Modal isOpen={declined} onClose={() => undefined}>
      <ModalOverlay backdropFilter='blur(8px)' />
      <ModalContent>
        <ModalHeader> </ModalHeader>
        <ModalBody>
          <Text>您已拒绝继续使用，请关闭浏览器窗口。</Text>
        </ModalBody>
        <ModalFooter>
          <Button onClick={() => setDeclined(false)}>重新选择</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  </>;
}
