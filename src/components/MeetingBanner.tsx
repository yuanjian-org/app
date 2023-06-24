import {
  Avatar,
  Button,
  Flex,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import React, { Fragment, useState } from 'react';
import tClientBrowser from "../tClientBrowser";
import { MdVideocam } from 'react-icons/md';
import { toast } from "react-toastify";
import Link from 'next/link';
import useUserContext from 'useUserContext';

// @ts-ignore TODO: fix me.
export default function MeetingBanner(props) {
  const [user] = useUserContext();
  const transcriptCount = props.countTranscripts ? props.group.transcripts.length : 0;
  const textColor = useColorModeValue('secondaryGray.700', 'white');
  const [isJoiningMeeting, setJoining] = useState(false);
  const launchMeeting = async (groupId: string) => {
    setJoining(true);
    try {
      const link = await tClientBrowser.myGroups.generateMeetingLink.mutate({ groupId: groupId });
      window.location.href = link;
    } catch (e) {
      toast.error((e as Error).message, { autoClose: false });
    } finally {
      // More time is needed to redirect to the meeting page. Keep it spinning.
      // We should uncomment this line if we pop the page in a new window.
      // setJoining(false);
    }
  }

  return (
    <Flex flexWrap='wrap' gap={4}>
      <VStack>
        <Button variant='outline' leftIcon={<MdVideocam />}
          isLoading={isJoiningMeeting} loadingText={'进入中...'}
          onClick={async () => launchMeeting(props.group.id)}>进入会议
        </Button>
        {props.countTranscripts &&
          <Link href={`/groups/${props.group.id}`}>
            <Text color={textColor} fontSize='sm' >
              {(transcriptCount ? `${transcriptCount} 个` : '无') + '历史摘要'}
            </Text>
          </Link>
        }
      </VStack>
      {
        props.group.users
        .filter((u: any) => user.id != u.id)
        .map((user: any) => {
          return <Fragment key={user.name}>
            <Avatar name={user.name} />
            <Text color={textColor}>{user.name}</Text>
          </Fragment>;
        })
      }
    </Flex>
  );
}
