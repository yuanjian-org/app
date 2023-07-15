import {
  Avatar,
  Box,
  Button,
  Center,
  Flex,
  SimpleGrid,
  Spacer,
  Text,
  Wrap,
  WrapItem,
  LinkBox,
  LinkOverlay,
  AvatarGroup,
  ButtonProps
} from '@chakra-ui/react';
import React, { Children, useState } from 'react';
import trpc from "../trpc";
import { MdVideocam } from 'react-icons/md';
import Link from 'next/link';
import { useUserContext } from 'UserContext';
import { formatGroupName } from 'shared/strings';
import { sidebarBreakpoint } from './Navbars';
import UserChip from './UserChip';
import { MinUserProfile } from 'shared/UserProfile';
import { Group, GroupCountingTranscripts } from 'shared/Group';

export default function GroupBar(props: {
  group: Group | GroupCountingTranscripts,
  showSelf?: boolean,             // default: false
  showJoinButton?: boolean,       // default: false
  showTranscriptCount?: boolean,  // default: false
  showTranscriptLink?: boolean,   // Effective ony if showTranscriptCount is true
  abbreviateOnMobile?: boolean,   // default: true
}) {
  const [user] = useUserContext();
  const transcriptCount = ("transcripts" in props.group ? props.group.transcripts : []).length;
  const [isJoiningMeeting, setJoining] = useState(false);
  const launchMeeting = async (groupId: string) => {
    setJoining(true);
    try {
      const link = await trpc.myGroups.generateMeetingLink.mutate({ groupId: groupId });
      window.location.href = link;
    } catch (e) {
      // See comments in the `finally` block below.
      setJoining(false);
      throw e;
    } finally {
      // More time is needed to redirect to the meeting page. Keep it spinning.
      // We should uncomment this line and remove this above catch block if we pop the page in a new window.
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
        <Box>
          <JoinButton
            isLoading={isJoiningMeeting} loadingText={'加入中...'}
            onClick={async () => launchMeeting(props.group.id)}
          >加入</JoinButton>
        </Box>
      }

      {/* row 2 col 2 */}
      <LinkBox>
        <Flex>
          <UserChips 
            currentUserId={props.showSelf ? undefined : user.id} 
            users={props.group.users}
            abbreviateOnMobile={props.abbreviateOnMobile}
          />

          {props.showTranscriptCount && <>
            <Spacer marginLeft={4}/>
            <Center>
              <Text color={transcriptCount ? 'default': 'gray'}>
                {props.showTranscriptLink ?
                  <LinkOverlay as={Link} href={`/groups/${props.group.id}`}>
                    详情 ({transcriptCount})
                  </LinkOverlay>
                  :
                  <>详情 ({transcriptCount})</>
                }
              </Text>
            </Center>
          </>}
        </Flex>
      </LinkBox>
    </SimpleGrid>
  );
}

export function JoinButton(props: ButtonProps) {
  return <Button
    boxShadow="md"
    borderRadius="16px"
    bgColor="white"
    leftIcon={<MdVideocam />}
    {...props}
  >{props.children ? props.children : "加入"}</Button>;
}

export function UserChips(props: { 
  currentUserId?: string, 
  users: MinUserProfile[],
  abbreviateOnMobile?: boolean, // default: true
}) {
  const displayUsers = props.users.filter((u: any) => props.currentUserId != u.id);
  const abbreviateOnMobile = (props.abbreviateOnMobile === undefined || props.abbreviateOnMobile) 
    // Mobile screen can only accommodate one person per row when their names are displayed. So abbreviate as long as
    // there are more than one user.
    && displayUsers.length > 1;

  return <>
    {/* Abbreviated mode */}
    <AvatarGroup 
      max={displayUsers.length > 4 ? 3 : 4} // No reason to display a "+1" avatar.
      display={{
        base: abbreviateOnMobile ? "flex" : "none",
        [sidebarBreakpoint]: "none",
      }}
    >
      {displayUsers.map(user => <Avatar key={user.id} name={user.name || undefined} />)}
    </AvatarGroup>

    {/* Unabridged mode */}
    <Wrap spacing='1.5em' display={{
      base: abbreviateOnMobile ? "none" : "flex",
      [sidebarBreakpoint]: "flex",
    }}>
      {displayUsers.map((user: any, idx: number) =>
        <WrapItem key={user.id}>
          <UserChip user={user} />
        </WrapItem >
      )}
    </Wrap>
  </>;
}
