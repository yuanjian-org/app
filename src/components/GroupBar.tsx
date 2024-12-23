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
  HStack,
  Tooltip,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import trpc from "../trpc";
import { MdVideocam } from 'react-icons/md';
import Link from 'next/link';
import { useUserContext } from 'UserContext';
import { formatGroupName } from 'shared/strings';
import ModalWithBackdrop from './ModalWithBackdrop';
import { breakpoint } from 'theme/metrics';
import UserChip from './UserChip';
import { MinUser } from 'shared/User';
import { Group, isOwned } from 'shared/Group';
import { ChevronRightIcon, QuestionIcon } from '@chakra-ui/icons';
import { publicGroupDescription } from 'pages/groups';

export default function GroupBar({
  group, showSelf, showJoinButton, showTranscriptLink, abbreviateOnMobile,
  abbreviateOnDesktop, showGroupName, ...rest
} : {
  group: Group,
  showSelf?: boolean,             // default: false
  showJoinButton?: boolean,       // default: false
  showTranscriptLink?: boolean,   // default: false
  showGroupName?: boolean,        // default: true
  abbreviateOnMobile?: boolean,   // default: true
  abbreviateOnDesktop?: boolean,  // default: false
} & SimpleGridProps) {
  const [user] = useUserContext();
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
        // Attempts to open the link in a new browser tab.
        // If blocked or unsuccessful, it opens the link in the current tab.
        // Ref: https://stackoverflow.com/a/2917 
        const newWindow = window.open(link, '_blank');  
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          window.location.href = link;
          // Time is needed for the meeting page to load.
          setTimeout(() => setJoining(false), 5000);
        } else {
          setJoining(false);
        }
      }
    } catch (e) {
      setJoining(false);
      throw e;
    }
  };

  if (showGroupName == undefined) showGroupName = true;

  return (
    <SimpleGrid 
      columns={(showJoinButton ? 2 : 1)} 
      templateColumns={(showJoinButton ? '6em ' : '') + '1fr'}
      spacing={4}
      {...rest}
    >
      {showMeetingQuotaWarning && <OngoingMeetingWarning onClose={
        () => setShowMeetingQuotaWarning(false)} />}

      {/* row 1 col 1 */}
      {showGroupName && showJoinButton && <Box />}

      {/* row 1 col 2 */}
      {showGroupName ? <GroupTagOrName group={group} /> : null}

      {/* row 2 col 1 */}
      {showJoinButton &&
        <Box>
          <JoinButton
            isLoading={isJoiningMeeting}
            onClick={() => launchMeeting(group.id)}
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
            abbreviateOnDesktop={abbreviateOnDesktop}
          />

          {showTranscriptLink && <>
            <Spacer marginLeft={4}/>
            <Center>
              <Text>
                <LinkOverlay as={Link} href={`/groups/${group.id}`}>
                  详情 <ChevronRightIcon />
                </LinkOverlay>
              </Text>
            </Center>
          </>}
        </Flex>
      </LinkBox>
    </SimpleGrid>
  );
}

function GroupTagOrName({ group }: { group: Group }) {
  return <HStack>
    {group.archived && <Tag color="white" bgColor="gray.800">已存档</Tag>}

    {group.public && <Tooltip label={publicGroupDescription}>
      <Tag color="white" bgColor="green.400">
        公开
        <QuestionIcon color="white" marginStart={2} />
      </Tag>
    </Tooltip>}

    {isOwned(group) ?
      <Tag color="white" bgColor="gray">
      {group.partnershipId ? "一对一导师" :
        group.calibrationId ? "面试讨论" :
          group.coacheeId ? "资深导师" :
            group.interviewId ? "面试" :
              "FIXME" }
      </Tag>
      :      
      <Text color='gray' fontSize='sm'>
        {formatGroupName(group.name, group.users.length)}
      </Text>
    }
  </HStack>;
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
  abbreviateOnDesktop?: boolean, // default: false
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
        [breakpoint]: props.abbreviateOnDesktop ? "flex" : "none",
      }}
    >
      {displayUsers.map(user => <Avatar key={user.id} name={user.name || undefined} />)}
    </AvatarGroup>

    {/* Unabridged mode */}
    <Wrap spacing='1.5em' display={{
      base: abbreviateOnMobile ? "none" : "flex",
      [breakpoint]: props.abbreviateOnDesktop ? "none" : "flex",
    }}>
      {displayUsers.map(user =>
        <WrapItem key={user.id}>
          <UserChip user={user} />
        </WrapItem >
      )}
    </Wrap>
  </>;
}
