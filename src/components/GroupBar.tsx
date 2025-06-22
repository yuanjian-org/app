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
  SimpleGridProps,
  Tag,
  HStack,
  Tooltip,
  VStack,
  Heading
} from '@chakra-ui/react';
import { useState } from 'react';
import trpc, { trpcNext } from "../trpc";
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
import { ConsentText } from './PostLoginModels';

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
        const w = window.open(link, '_blank');  
        if (!w || w.closed || typeof w.closed === 'undefined') {
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
      templateColumns={(showJoinButton ? '5.5em ' : '') + '1fr'}
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
            join={() => launchMeeting(group.id)}
          />
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
        {group.calibrationId ? "面试讨论" : group.interviewId ? "面试" : "FIXME"}
      </Tag>
      : 
      group.name ?
        <Text color='gray' fontSize='sm'>
          {formatGroupName(group.name, group.users.length)}
        </Text>
        :
        <></>
    }
  </HStack>;
}

function JoinButton({ join, isLoading }: {
  join: () => void,
  isLoading?: boolean,
}) {
  const { data: state, refetch } = trpcNext.users.getUserState.useQuery();
  const consented = !!state?.meetingConsentedAt;
  const [showConsentModal, setShowConsentModal] = useState(false);

  return <>
    <Button
      borderRadius="16px"
      bgColor="white"
      leftIcon={<MdVideocam />}
      onClick={consented ? join : () => setShowConsentModal(true)}
      isLoading={isLoading}
    >加入</Button>

    {showConsentModal && <MeetingConsentModal
      onClose={() => setShowConsentModal(false)}
      consent={() => {
        void refetch();
        join();
      }}
    />}
  </>;
}

function MeetingConsentModal({ consent, onClose }: {
  consent: () => void,
  onClose: () => void,
}) {
  const [declined, setDeclined] = useState<boolean>(false);

  const submit = async () => {
    await trpc.users.setUserState.mutate({
      meetingConsentedAt: new Date().toISOString(),
    });
    consent();
    onClose();
  };

  const decline = async () => {
    setDeclined(true);
    await trpc.meetings.decline.mutate();
  };

  return <>
    <ModalWithBackdrop isOpen={!declined} onClose={onClose}>
      <ModalContent>
        <ModalHeader>自动录制</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={6} marginBottom={10} align='left'>
            <Text>
              您在每次加入会议时都会看到腾讯会议的自动录制提示，这是智能会议纪要{
              }功能所需要的。但是，系统只会保存腾讯会议生成的智能纪要，而不会下载或使用{
              }腾讯会议录制的音视频。此外，在会议结束后，您也可以修改智能纪要，删掉过于隐私{
              }的内容。
            </Text>
            <Heading size='md'>声明</Heading>
            <ConsentText />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button onClick={decline}>拒绝使用会议</Button>
          <Spacer />
          <Button variant='brand' onClick={submit}>同意自动录制每次会议</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>

    <ModalWithBackdrop isOpen={declined} onClose={onClose}>
      <ModalContent>
        <ModalHeader />
        <ModalCloseButton />
        <ModalBody>
          <Text>您已拒绝使用本平台的会议功能。工作人员会与您取得联系，商量解决方案。</Text>
        </ModalBody>
        <ModalFooter>
          <Button variant='brand' onClick={onClose}>好的</Button>
        </ModalFooter>
      </ModalContent>
    </ModalWithBackdrop>
  </>;
}

function MeetingQuotaWarning({ onClose }: {
  onClose: () => void,
}) {
  return (<ModalWithBackdrop isOpen onClose={onClose}>
    <ModalOverlay />
    <ModalContent>
      <ModalHeader>无法加入会议</ModalHeader>
      <ModalCloseButton />
      <ModalBody>
        <p>抱歉，同时进行的会议数量已超过上线。请稍后再试。<br /><br />
        系统管理员已收到通知，会及时处理。</p>
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>
          确认
        </Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>
  );
}

function UserChips({
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
