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
export default function GroupBanner(props: {
  group: any,
  showSelf?: boolean,
  showJoinButton?: boolean,
  countTranscripts?: boolean,
  showTranscriptLink?: boolean,   // Effective ony when countTranscripts is true
}) {
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

  const join = props.showJoinButton;
  return (
    <SimpleGrid columns={join ? 3 : 2} templateColumns={(join ? '7em ' : '') + '2fr 1fr'} spacing={2}>
      {join &&
        <Center>
          <Button variant='outline' leftIcon={<MdVideocam />}
            isLoading={isJoiningMeeting} loadingText={'加入中...'}
            onClick={async () => launchMeeting(props.group.id)}>加入</Button>
        </Center>
      }
      <UserList currentUserId={props.showSelf ? undefined : user.id} users={props.group.users} />
      <Center>
        {props.countTranscripts &&
          (props.showTranscriptLink ? 
            <Link href={`/groups/${props.group.id}`}>
              {transcriptCount ?
                <>{transcriptCount} 个历史记录 <ArrowForwardIcon /></>
                : 
                <Text color='gray.400'>无历史 <ArrowForwardIcon /></Text>
              }
            </Link>
            :
            <>
              {transcriptCount ?
                <>{transcriptCount} 个历史记录</>
                : 
                <Text color='gray.400'>无历史</Text>
              }
            </>
          )
        }
      </Center>
    </SimpleGrid>
  );
}

function UserList(props: { currentUserId?: string, users: { id: string, name: string | null }[]}) {
  return <Wrap spacing='1.5em'> {
    props.users
    .filter((u: any) => props.currentUserId != u.id)
    .map((user: any) =>
      <WrapItem key={user.id}>
        <HStack>
          <Avatar name={user.name} boxSize={10}/>
          <Text>{user.name}</Text>
        </HStack>
      </WrapItem >
    )
  } </Wrap>
}