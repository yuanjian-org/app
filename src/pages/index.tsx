import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  ModalContent,
  ModalHeader,
  ModalBody,
  StackDivider,
  Text,
  VStack,
  FormLabel,
  Input,
  FormControl,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { NextPageWithLayout } from "../NextPageWithLayout";
import AppLayout from "../AppLayout";
import useUserContext from "../useUserContext";
import tClientBrowser from "../tClientBrowser";
import tClientNext from "../tClientNext";
import { toast } from "react-toastify";
import GroupBar from 'components/GroupBar';
import PageBreadcrumb from 'components/PageBreadcrumb';
import ConsentModal, { consentFormAccepted } from '../components/ConsentModal';
import ModalWithBackdrop from 'components/ModalWithBackdrop';
import { isValidChineseName } from '../shared/utils/string';

const Index: NextPageWithLayout = () => {
  const [user] = useUserContext();
  const userHasName = !!user.name;
  return <>
    {!userHasName && <SetNameModal />}
    {userHasName && !consentFormAccepted(user) && <ConsentModal />}
    <Box paddingTop={'80px'}><Meetings /></Box>
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

      // TODO: Handle error display globally. Redact server-side errors.
      try {
        await tClientBrowser.users.update.mutate(updatedUser);
        setUser(updatedUser);
      } catch (e) {
        toast.error((e as Error).message);
      }
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
  const { data: groups, isLoading } = tClientNext.myGroups.list.useQuery();

  return (
    <Card>
      <CardHeader>
        <PageBreadcrumb current='我的会议' parents={[]} />
      </CardHeader>
      <CardBody>
        {!groups
        && isLoading
        && <Text align='center'>
            正在加载会议...
        </Text>}
        
        {groups
        && groups.length == 0
        && !isLoading
        && <Text align='center'>
            会议将在管理员设置后可见
           </Text>}
        
        <VStack divider={<StackDivider />} align='left' spacing='6'>
          {groups &&
            groups.map(group => 
              <GroupBar key={group.id} group={group} showJoinButton showTranscriptCount showTranscriptLink />)
          }
        </VStack>
      </CardBody>
    </Card>
  );
}
