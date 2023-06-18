import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Heading,
  StackDivider,
  Text,
  VStack,
  useColorModeValue,
  FormLabel,
  Input,
  FormControl,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { NextPageWithLayout } from "../NextPageWithLayout";
import AppLayout from "../layouts";
import useUserContext from "../useUserContext";
import tClientBrowser from "../tClientBrowser";
import tClientNext from "../tClientNext";
import PublicUser from '../shared/publicModels/PublicUser';
import PublicGroup from '../shared/publicModels/PublicGroup';
import { MdVideocam } from 'react-icons/md';
import { toast } from "react-toastify";
import pinyin from 'tiny-pinyin';

const Index: NextPageWithLayout = () => {
  const [user] = useUserContext();
  return <Box paddingTop={'80px'}> {user.name ? <></> : <SetNameModal />} <Meetings /></Box>
}

Index.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Index;

function SetNameModal() {
  const [user, setUser] = useUserContext();
  const [isOpen, setOpen] = useState(true);
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (name) {
      const updatedUser = structuredClone(user);
      updatedUser.name = name;

      // TODO: Handle error display globally. Redact server-side errors.
      try {
        await tClientBrowser.user.updateProfile.mutate(updatedUser);
        console.log("user name update succeeded");
        setUser(updatedUser);
        setOpen(false);
      } catch (e) {
        toast.error((e as Error).message);
      }
    };
  };

  return (
  // onClose returns undefined to prevent user from closing the modal without entering name.
  <Modal isOpen={isOpen} onClose={() => undefined}>
      <ModalOverlay backdropFilter='blur(8px)' />
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
    </Modal>
  );
}

function isValidChineseName(s: string) : boolean {
  return s.length >= 2 && pinyin.parse(s).every(token => token.type === 2);
}

function Meetings() {
  const { data } = tClientNext.myMeetings.list.useQuery({});
  const [user] = useUserContext();

  return (
    <Card>
      <CardHeader>
        <Heading size='md'>会议列表</Heading>
      </CardHeader>
      <CardBody>
        <VStack divider={<StackDivider />} align='left' spacing='6'>
          {data &&
            data.groupList.map((group: PublicGroup, idx: any) => Meeting(user.id, group, data.userMap))
          }
        </VStack>
      </CardBody>
    </Card>
  );
}

function Meeting(myUserId: string, group: PublicGroup, userMap: Record<string, PublicUser>): React.JSX.Element {
  const textColor = useColorModeValue('secondaryGray.700', 'white');
  return (
    <Flex flexWrap='wrap' gap={4}>
      <Button variant='outline' leftIcon={<MdVideocam />} onClick={async () => launchMeeting(group.id)}>进入会议</Button>
      {
        group.userIdList.filter(id => id !== myUserId).map(id => {
          const name = userMap[id].name;
          return <>
            <Avatar name={name} />
            <Text color={textColor}>{name}</Text>
          </>;
        }
        )
      }
    </Flex>
  );
}

async function launchMeeting(groupId: string) {
  const meetingLink = await tClientBrowser.myMeetings.generateMeetingLink.mutate({ groupId: groupId });
  window.location.href = meetingLink;
}
