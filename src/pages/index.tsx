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
import React, { Fragment, useState } from 'react';
import { NextPageWithLayout } from "../NextPageWithLayout";
import AppLayout from "../layouts";
import useUserContext from "../useUserContext";
import tClientBrowser from "../tClientBrowser";
import tClientNext from "../tClientNext";
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

      tClientBrowser.user.updateProfile.mutate(updatedUser).then(
        res => {
          if (res === "ok") {
            console.log("user name update succeeded");
            setUser(updatedUser);
            setOpen(false);
          }
        }
      ).catch(e => toast.error(e.message, { autoClose: false }));
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
            data.groupList.map((group: PublicGroup, idx: any) => 
              <Meeting key={idx} user={user} group={group} userMap={data.userMap} />)
          }
        </VStack>
      </CardBody>
    </Card>
  );
}

// @ts-ignore type checking for props is anonying
function Meeting(props) {
  const textColor = useColorModeValue('secondaryGray.700', 'white');
  return (
    <Flex flexWrap='wrap' gap={4}>
      <Button variant='outline' leftIcon={<MdVideocam />} 
        onClick={async () => launchMeeting(props.group.id)}>进入会议
      </Button>
      {
        props.group.userIdList.filter((id: string) => id !== props.user).map((id: string) => {
          const name = props.userMap[id].name;
          return <Fragment key={id}>
            <Avatar name={name} />
            <Text color={textColor}>{name}</Text>
          </Fragment>;
        })
      }
    </Flex>
  );
}

async function launchMeeting(groupId: string) {
  const meetingLink = await tClientBrowser.myMeetings.generateMeetingLink.mutate({ groupId: groupId });
  window.location.href = meetingLink;
}
