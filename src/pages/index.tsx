import {
  Avatar,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Heading,
  StackDivider,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import React from 'react'
import { NextPageWithLayout } from "../NextPageWithLayout";
import AppLayout from "../layouts";
import useUserInfo from "../useUserInfo";
import tClientBrowser from "../tClientBrowser";
import tClientNext from "../tClientNext";
import PublicUser from '../shared/publicModels/PublicUser';
import PublicGroup from '../shared/publicModels/PublicGroup';
import { MdVideocam } from 'react-icons/md';

const AppIndex: NextPageWithLayout = () => {
  const user = useUserInfo();
  return <Box paddingTop={'80px'}><Meetings /></Box>;
}

AppIndex.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default AppIndex;

function Meetings() {
  const { data } = tClientNext.myMeetings.list.useQuery({});
  const { id: myUserId } = useUserInfo();

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
  const meetingLink = await tClientBrowser.myMeetings.generateMeetingLink.mutate({groupId: groupId});
  window.location.href = meetingLink;
}
