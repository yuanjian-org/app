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
import { useState } from 'react';
import trpc from "../trpc";
import { MdVideocam } from 'react-icons/md';
import Link from 'next/link';
import { formatGroupName } from 'shared/strings';
import ModalWithBackdrop from './ModalWithBackdrop';
import { breakpoint } from 'theme/metrics';
import UserChip from './UserChip';
import { MinUser } from 'shared/User';
import { Group, isOwned } from 'shared/Group';
import { ChevronRightIcon, QuestionIcon } from '@chakra-ui/icons';
import { publicGroupDescription } from 'pages/groups';
import { useMyId } from 'useMe';

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
  const myId = useMyId();
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
      {showMeetingQuotaWarning && <MeetingQuotaWarning onClose={
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
            currentUserId={showSelf ? undefined : myId} 
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

    {/*
      * Don't display the tag if the group is for mentorship. It used to display
      * "一对一导师" but we want to weaken mentees' impression of being mentored.
      */}
    {isOwned(group) && !group.partnershipId ?
      <Tag color="white" bgColor="gray">
      {group.calibrationId ? "面试讨论" :
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

export function MeetingQuotaWarning(props: {
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

export function UserChips({
  currentUserId,
  users,
  abbreviateOnMobile,
  abbreviateOnDesktop,
}: { 
  currentUserId?: string, 
  users: MinUser[],
  abbreviateOnMobile?: boolean, // default: true
  abbreviateOnDesktop?: boolean, // default: false
}) {
  const displayUsers = users.filter((u: any) => currentUserId != u.id);
  
  // Abbreviate only if there are more than one user.
  const abbrOnDesktop = abbreviateOnDesktop && displayUsers.length > 1;
  const abbrOnMobile = (abbreviateOnMobile === undefined || abbreviateOnMobile) 
    && displayUsers.length > 1;

  return <>
    {/* Abbreviated mode */}
    <AvatarGroup 
      max={displayUsers.length > 4 ? 3 : 4} // No reason to display a "+1" avatar.
      display={{
        base: abbrOnMobile ? "flex" : "none",
        [breakpoint]: abbrOnDesktop ? "flex" : "none",
      }}
    >
      {displayUsers.map(user => <Avatar key={user.id} name={user.name || undefined} />)}
    </AvatarGroup>

    {/* Unabridged mode */}
    <Wrap spacing='1.5em' display={{
      base: abbrOnMobile ? "none" : "flex",
      [breakpoint]: abbrOnDesktop ? "none" : "flex",
    }}>
      {displayUsers.map(user =>
        <WrapItem key={user.id}>
          <UserChip user={user} />
        </WrapItem >
      )}
    </Wrap>
  </>;
}
