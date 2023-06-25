import {
  Avatar,
  Button,
  Center,
  HStack,
  SimpleGrid,
  Text,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import tClientBrowser from "../tClientBrowser";
import { MdVideocam } from 'react-icons/md';
import { toast } from "react-toastify";
import Link from 'next/link';
import useUserContext from 'useUserContext';
import { ArrowForwardIcon } from '@chakra-ui/icons';

// @ts-ignore TODO: fix me.
export default function GroupBanner(props) {
  const [user] = useUserContext();
  const transcriptCount = props.countTranscripts ? props.group.transcripts.length : 0;
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
    <SimpleGrid columns={3} templateColumns={'9em 2fr 1fr'} spacing={5}>
      <Center>
        <Button variant='outline' leftIcon={<MdVideocam />}
          isLoading={isJoiningMeeting} loadingText={'进入中...'}
          onClick={async () => launchMeeting(props.group.id)}>进入会议
        </Button>
      </Center>
      <Wrap spacing='1.5em'>
      {
        props.group.users
        .filter((u: any) => user.id != u.id)
        .map((user: any) => 
          <WrapItem key={user.name}>
            <HStack>
              <Avatar name={user.name} />
              <Text>{user.name}</Text>
            </HStack>
          </WrapItem >
        )
      }
      </Wrap>
    <Center>
      {props.countTranscripts &&
          <Link href={`/groups/${props.group.id}`}>
            {transcriptCount ?
              <>{transcriptCount} 个摘要 <ArrowForwardIcon /></>
              : 
              <Text color='gray.400'>无摘要 <ArrowForwardIcon /></Text>
            }
          </Link>
        }
      </Center>
    </SimpleGrid>
  );
}
