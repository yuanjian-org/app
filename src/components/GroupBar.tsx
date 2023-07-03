import {
  Avatar,
  Box,
  Button,
  Center,
  Flex,
  HStack,
  SimpleGrid,
  Spacer,
  Text,
  VStack,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import trpc from "../trpc";
import { MdVideocam } from 'react-icons/md';
import Link from 'next/link';
import useUserContext from 'useUserContext';
import { ArrowForwardIcon } from '@chakra-ui/icons';
import formatGroupName from 'formatGroupName';

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
      columns={(props.showJoinButton ? 2 : 1)} 
      templateColumns={(props.showJoinButton ? '6em ' : '') + '1fr'}
      spacing={4}
    >
      {/* row 1 col 1 */}
      {props.showJoinButton && <Box />}

      {/* row 1 col 2 */}
      <Text color='grey' fontSize='sm'>{formatGroupName(props.group.name, props.group.users.length)}</Text>
      
      {/* row 2 col 1 */}
      {props.showJoinButton &&
        <Center>
          <Button
            boxShadow="md"
            leftIcon={<MdVideocam />}
            isLoading={isJoiningMeeting} loadingText={'加入中...'}
            onClick={async () => launchMeeting(props.group.id)}
          >加入</Button>
          <Spacer />
        </Center>
      }

      {/* row 2 col 2 */}
      <Flex>
        <UserChips currentUserId={props.showSelf ? undefined : user.id} users={props.group.users} />

        {props.showTranscriptCount && <>
          <Spacer marginLeft={4}/>
          <Center>
            {props.showTranscriptLink ? 
              <Link href={`/groups/${props.group.id}`}>
                {transcriptCount ?
                  <>{transcriptCount} 个历史记录 <ArrowForwardIcon /></>
                  : 
                  <Text color='grey'>无历史 <ArrowForwardIcon /></Text>
                }
              </Link>
              :
              <>
                {transcriptCount ?
                  <>{transcriptCount} 个历史记录</>
                  : 
                  <Text color='grey'>无历史</Text>
                }0
              </>
            }
          </Center>
        </>}
      </Flex>
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
