import {
  Box,
  Button,
  ModalContent,
  ModalHeader,
  ModalBody,
  StackDivider,
  Text,
  VStack,
  FormLabel,
  Input,
  FormControl,
  Link,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { NextPageWithLayout } from "../NextPageWithLayout";
import AppLayout from "../AppLayout";
import { useUserContext } from "../UserContext";
import trpc from "../trpc";
import { trpcNext } from "../trpc";
import GroupBar from '../components/GroupBar';
import PageBreadcrumb from '../components/PageBreadcrumb';
import ConsentModal, { consentFormAccepted } from '../components/ConsentModal';
import ModalWithBackdrop from '../components/ModalWithBackdrop';
import { isValidChineseName } from '../shared/strings';
import Loader from '../components/Loader';
import { isPermitted } from '../shared/Role';

const Index: NextPageWithLayout = () => {
  const [user] = useUserContext();
  const userHasName = !!user.name;
  return <>
    {!userHasName && <SetNameModal />}
    {userHasName && !consentFormAccepted(user) && <ConsentModal />}
    <Meetings />
  </>;
}

Index.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Index;

function SetNameModal() {
  const [user, setUser] = useUserContext();
  const [name, setName] = useState(user.name || '');
  const handleSubmit = async () => {
    if (name) {
      const updatedUser = structuredClone(user);
      updatedUser.name = name;
      await trpc.users.update.mutate(updatedUser);
      setUser(updatedUser);
    };
  };

  return (
    // onClose returns undefined to prevent user from closing the modal without entering name.
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
                onClick={handleSubmit}
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

function Meetings() {
  const [me] = useUserContext();
  const { data: groups, isLoading } = trpcNext.groups.listMine.useQuery({
    // Mentors have mentee groups listed in partnership pages.
    // TODO: This is a hack. Do it properly.
    includeOwned: !isPermitted(me.roles, "Mentor"),
  });

  return (<>
    <PageBreadcrumb current='我的会议' parents={[]} />
    {isLoading && <Loader />}
    
    {groups && groups.length == 0 && !isLoading && <Text>
      会议将在管理员设置后可见。在继续使用前：
      <br /><br />
      🇨🇳 国内用户请安装腾讯会议（<Link isExternal href="https://meeting.tencent.com/download/">下载</Link>）
      <br /><br />
      🌎 海外用户请安装海外版腾讯会议（<Link isExternal href="https://voovmeeting.com/download-center.html">下载</Link>）
    </Text>}
    
    <VStack divider={<StackDivider />} align='left' spacing='6'>
      {groups &&
        groups.map(group => 
          <GroupBar key={group.id} group={group} 
            showJoinButton showTranscriptCount showTranscriptLink abbreviateOnMobile
          />)
      }
    </VStack>
  </>);
}
