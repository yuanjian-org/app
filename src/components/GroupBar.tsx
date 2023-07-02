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
import trpc from "../trpc";
import { MdVideocam } from 'react-icons/md';
import Link from 'next/link';
import useUserContext from 'useUserContext';
import { ArrowForwardIcon } from '@chakra-ui/icons';

// @ts-ignore TODO: fix me.
export default function GroupBar(props: {
  group: any,
  showSelf?: boolean,
  showJoinButton?: boolean,
  showTranscriptCount?: boolean,
  showTranscriptLink?: boolean,   // Effective ony if showTranscriptCount is true
}) {
  const [user] = useUserContext();
  const transcriptCount = (props.group.transcripts || []).length;
  const [isJoiningMeeting, setJoining] = useState(false);
  const launchMeeting = async (groupId: string) => {
    setJoining(true);
    try {
      const link = await trpc.myGroups.generateMeetingLink.mutate({ groupId: groupId });
      window.location.href = link;
    } finally {
      // More time is needed to redirect to the meeting page. Keep it spinning.
      // We should uncomment this line if we pop the page in a new window.
      // setJoining(false);
    }
  }

  return (
    <SimpleGrid 
      columns={(props.showJoinButton ? 1 : 0) + 1 + (props.showTranscriptCount ? 1 : 0)} 
      templateColumns={(props.showJoinButton ? '7em ' : '') + '2fr' + (props.showTranscriptCount ? ' 1fr' : '')} 
      spacing={2}
    >
      {props.showJoinButton &&
        <Center>
          <Button variant='outline' leftIcon={<MdVideocam />}
            isLoading={isJoiningMeeting} loadingText={'加入中...'}
            onClick={async () => launchMeeting(props.group.id)}>加入</Button>
        </Center>
      }
      <UserChips currentUserId={props.showSelf ? undefined : user.id} users={props.group.users} />
      <Center>
        {props.showTranscriptCount &&
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

function UserChips(props: { currentUserId?: string, users: { id: string, name: string | null }[]}) {
  return <Wrap spacing='1.5em'> {
    props.users
    .filter((u: any) => props.currentUserId != u.id)
    .map((user: any) =>
      <WrapItem key={user.id}>
        <UserChip user={user} />
      </WrapItem >
    )
  } </Wrap>
}

export function UserChip(props: {
  user: { id: string, name: string | null }
}) {
  return <HStack>
    <Avatar name={props.user.name || undefined} boxSize={10}/>
    <Text>{props.user.name}</Text>
  </HStack>;
}
