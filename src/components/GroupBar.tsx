import {
  Avatar,
  Box,
  Button,
  Center,
  Flex,
  ModalHeader,
  ModalContent,
  ModalCloseButton,
  ModalOverlay,
  ModalBody,
  ModalFooter,
  SimpleGrid,
  Spacer,
  Text,
  Wrap,
  WrapItem,
  LinkBox,
  LinkOverlay,
  AvatarGroup,
  ButtonProps,
  SimpleGridProps,
  Tag,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import trpc from "../trpc";
import { MdVideocam } from 'react-icons/md';
import Link from 'next/link';
import { useUserContext } from 'UserContext';
import { formatGroupName } from 'shared/strings';
import ModalWithBackdrop from './ModalWithBackdrop';
import { sidebarBreakpoint } from './Navbars';
import UserChip from './UserChip';
import { MinUser } from 'shared/User';
import { Group, GroupCountingTranscripts, isOwned } from 'shared/Group';

export default function GroupBar({
  group, showSelf, showJoinButton, showTranscriptCount, showTranscriptLink, abbreviateOnMobile, showGroupName, ...rest
} : {
  group: Group | GroupCountingTranscripts,
  showSelf?: boolean,             // default: false
  showJoinButton?: boolean,       // default: false
  showTranscriptCount?: boolean,  // default: false
  showTranscriptLink?: boolean,   // Effective ony if showTranscriptCount is true
  abbreviateOnMobile?: boolean,   // default: true
  showGroupName?: boolean,        // default: true
} & SimpleGridProps) {
  const [user] = useUserContext();
  const transcriptCount = ("transcripts" in group ? group.transcripts : []).length;
  const [isJoiningMeeting, setJoining] = useState(false);
  const [showMeetingQuotaWarning, setShowMeetingQuotaWarning] = useState(false);
  const launchMeeting = async (groupId: string) => {
    setJoining(true);
    try {
      const link = await trpc.meetings.join.mutate({ groupId: groupId });
      if (!link) {
        setShowMeetingQuotaWarning(true);
        setJoining(false);
      } else {
        window.location.href = link;
      }
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

  if (showGroupName == undefined) showGroupName = true;

  return (
    <SimpleGrid 
      columns={(showJoinButton ? 2 : 1)} 
      templateColumns={(showJoinButton ? '6em ' : '') + '1fr'}
      spacing={4}
      {...rest}
    >
      {showMeetingQuotaWarning && <OngoingMeetingWarning onClose={() => setShowMeetingQuotaWarning(false)}/>}
      {/* row 1 col 1 */}
      {showGroupName && showJoinButton && <Box />}

      {/* row 1 col 2 */}
      {showGroupName ? <GroupTagOrName group={group} /> : null}

      {/* row 2 col 1 */}
      {showJoinButton &&
        <Box>
          <JoinButton
            isLoading={isJoiningMeeting} loadingText={'加入中...'}
            onClick={async () => launchMeeting(group.id)}
          >加入</JoinButton>
        </Box>
      }

      {/* row 2 col 2 */}
      <LinkBox>
        <Flex>
          <UserChips 
            currentUserId={showSelf ? undefined : user.id} 
            users={group.users}
            abbreviateOnMobile={abbreviateOnMobile}
          />

          {showTranscriptCount && <>
            <Spacer marginLeft={4}/>
            <Center>
              <Text color={transcriptCount ? 'default': 'gray'}>
                {showTranscriptLink ?
                  <LinkOverlay as={Link} href={`/groups/${group.id}`}>
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

function GroupTagOrName({ group }: { group: Group }) {
  return isOwned(group) ?
    // Without this Box the tag will fill the whole grid row
    <Box justifyItems="left">
      <Tag color="white" bgColor="gray">
        {group.partnershipId ? "一对一导师" : "面试" }
      </Tag>
    </Box>
    :
    <Text color='grey' fontSize='sm'>{formatGroupName(group.name, group.users.length)}</Text>;
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

export function OngoingMeetingWarning(props: {
  onClose: () => void,
}) {
  return (<ModalWithBackdrop isOpen onClose={props.onClose}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>无法加入会议</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <p>抱歉，同时进行的会议数量已超过上线。请稍后再试。<br /><br />系统管理员已收到通知，会及时处理。</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={props.onClose}>
          确认
        </Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>
  );
}

export function UserChips(props: { 
  currentUserId?: string, 
  users: MinUser[],
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
