import {
  Alert,
  AlertIcon,
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
import useUserInfo from "../useUserInfo";
import tClientBrowser from "../tClientBrowser";
import tClientNext from "../tClientNext";
import PublicUser from '../shared/publicModels/PublicUser';
import PublicGroup from '../shared/publicModels/PublicGroup';
import { MdVideocam } from 'react-icons/md';
import { HSeparator } from 'horizon-ui/components/separator/Separator';
import { IYuanjianUser } from 'shared/user';
import { toast } from "react-toastify";

const AppIndex: NextPageWithLayout = () => {
  const { user, updateUser } = useUserInfo();
  return <Box paddingTop={'80px'}> {user.name ? <></> : <SetNameModal u={user} updateUser={updateUser} />} <Meetings /></Box>
}

AppIndex.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default AppIndex;

function SetNameModal({ u, updateUser }: { u: IYuanjianUser, updateUser: (IYuanjianUser: IYuanjianUser) => void }) {
  const [isOpen, setOpen] = useState(true);
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (name) {
      const nameUpdatedUser: IYuanjianUser = {
        id: u.id,
        pinyin: u.pinyin,
        name: name,
        email: u.email,
        roles: u.roles,
        clientId: u.clientId,
      };

      tClientBrowser.user.updateProfile.mutate(nameUpdatedUser).then(
        res => {
          if (res === "ok") {
            console.log("user name update succeeded");
            updateUser(nameUpdatedUser);
            setOpen(false);
          }
        }
      ).catch(e => toast.error(e.message, { autoClose: false }));
    };
  };

  return (
    <Modal isOpen={isOpen} onClose={() => undefined}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>新用户登录</ModalHeader>
        <ModalBody>
          <Text>
            请填写中文全名
          </Text>
          <Box mt={4}>
            <Flex align='center' mb='25px'>
              <HSeparator />
            </Flex>
            <FormControl>
              {!name && (
                <Alert status="error" mt={4}>
                  <AlertIcon />
                  姓名不能为空
                </Alert>
              )}
              <FormLabel>
                姓名
              </FormLabel>
              <Input
                isRequired={true}
                value={name}
                onChange={(e) => setName(e.target.value)}
                variant='auth'
                fontSize='sm'
                ms={{ base: '0px', md: '0px' }}
                placeholder='张三'
                mb='24px'
                fontWeight='500'
                size='lg'
              />
              <Button
                onClick={handleSubmit}
                fontSize='sm' variant='brand' fontWeight='500' w='100%' h='50' mb='24px'>
                确认提交
              </Button>
            </FormControl>
          </Box>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function Meetings() {
  const { data } = tClientNext.myMeetings.list.useQuery({});
  const { user } = useUserInfo();
  const myUserId = user.id;

  return (
    <Card>
      <CardHeader>
        <Heading size='md'>会议列表</Heading>
      </CardHeader>
      <CardBody>
        <VStack divider={<StackDivider />} align='left' spacing='6'>
          {data &&
            data.groupList.map((group: PublicGroup, idx: any) => Meeting(myUserId, group, data.userMap))
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
