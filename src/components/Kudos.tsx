import {
  Text, Button, VStack, Link,
  Spacer,
  Input, Tooltip, PopoverArrow,
  PopoverTrigger,
  Popover,
  PopoverContent,
  PopoverBody,
  Portal,
  ButtonGroup,
  FormControl,
  FormLabel,
  useDisclosure,
  ModalBody,
  ModalHeader,
  SimpleGrid,
  GridItem,
  ModalContent,
  ModalFooter,
  ModalCloseButton,
  Box,
  AbsoluteCenter,
  Divider
} from '@chakra-ui/react';
import { formatUserName, prettifyDate } from 'shared/strings';
import { componentSpacing } from 'theme/metrics';
import { MinUser } from 'shared/User';
import { useState, useRef } from 'react';
import trpc, { trpcNext } from 'trpc';
import { useUserContext } from 'UserContext';
import FocusLock from "react-focus-lock";
import { toast } from 'react-toastify';
import ModalWithBackdrop from './ModalWithBackdrop';
import { Kudos } from 'shared/Kudos';
import Loader from './Loader';
import { UserLink } from './UserChip';
import moment from 'moment';
import { SmallGrayText } from './SmallGrayText';
import { DateColumn } from 'shared/DateColumn';
import { UserState } from 'shared/UserState';
import RedDot from './RedDot';

export function KudosControl({ user, likes, kudos }: {
  user: MinUser,
  likes: number,
  kudos: number,
}) {
  const [me] = useUserContext();
  const name = formatUserName(user.name, "friendly");

  // This variable allows local update without waiting for server response.
  const [localLikes, setLocalLikes] = useState<number>(likes);
  const [localKudos, setLocalKudos] = useState<number>(kudos);
  const [popoverTitle, setPopoverTitle] = useState<string>("");

  const popoverInputRef = useRef<HTMLInputElement>(null);
  const {
    onOpen: onOpenPopover,
    onClose: onClosePopover,
    isOpen: isPopoverOpen
  } = useDisclosure();

  const saveLike = async () => {
    setLocalLikes(localLikes + 1);
    setPopoverTitle(`感谢点赞！要不要再给${name}留个言？（可选）`);
    onOpenPopover();
    await trpc.kudos.create.mutate({ userId: user.id, text: null });
  };

  const saveKudos = async (text: string) => {
    setLocalKudos(localKudos + 1);
    await trpc.kudos.create.mutate({ userId: user.id, text });
  };

  return me.id == user.id ? <MyKudosControl likes={likes} kudos={kudos} /> : <>
    <Tooltip
      label={`点赞后，${name}会收到Email哦`}
      placement="top"
    >
      <Text
        display="flex"
        alignItems="center"
        color="orange.600"
        cursor="pointer"
        onClick={saveLike}
      >
        👍{localLikes > 0 && ` ${localLikes}`}
      </Text>
    </Tooltip>

    {/**
      * See https://v2.chakra-ui.com/docs/components/popover#trapping-focus-within-popover
      * for the use of initialFocusRef, FocusLock, etc.
      */}
    <Popover
      isOpen={isPopoverOpen}
      onOpen={() => {
        setPopoverTitle(`赞一下${name}`);
        onOpenPopover();
      }}
      onClose={onClosePopover}
      initialFocusRef={popoverInputRef}
      // Ensure the popover doesn't close on outside click
      // closeOnBlur={false}
    >
      <PopoverTrigger>
        <Text
          display="flex"
          alignItems="center"
          color="orange.600"
          ms={2}
          cursor="pointer"
        >💬{localKudos > 0 && ` ${localKudos}`}</Text>
      </PopoverTrigger>

      <Portal>
        <PopoverContent boxShadow="lg">
          <FocusLock returnFocus persistentFocus={false}>
            <PopoverArrow />
            <PopoverBody>
              <KudosForm
                title={popoverTitle}
                user={user}
                fieldRef={popoverInputRef}
                save={saveKudos}
                onClose={onClosePopover}
              />
            </PopoverBody>
          </FocusLock>
        </PopoverContent>
      </Portal>
    </Popover>
  </>;
}

function MyKudosControl({ likes, kudos }: {
  likes: number,
  kudos: number,
}) {
  const [me] = useUserContext();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  return <>
    <Text
      display="flex"
      alignItems="center"
      color="orange.600"
      cursor="pointer"
      onClick={() => setIsHistoryOpen(true)}
    >
      👍{likes > 0 && ` ${likes}`}
    </Text>
    <Text
      display="flex"
      alignItems="center"
      color="orange.600"
      ms={2}
      cursor="pointer"
      onClick={() => setIsHistoryOpen(true)}
    >
      💬{kudos > 0 && ` ${kudos}`}
    </Text>

    {isHistoryOpen && <UserKudosHistoryModal user={me}
      onClose={() => setIsHistoryOpen(false)}
    />}
  </>;
}

function KudosForm({ title, user, fieldRef, save, onClose }: {
  title: string,
  user: MinUser,
  fieldRef: React.RefObject<HTMLInputElement>,
  save: (text: string) => Promise<void>,
  onClose: () => void,
}) {
  const [text, setText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const submit = async () => {
    setIsSaving(true);
    try {
      await save(text);
      toast.success("感谢你的赞！");
      setText("");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return <VStack spacing={componentSpacing}>
    <FormControl>
      <FormLabel mb={componentSpacing}>{title}</FormLabel>

      <Input
        ref={fieldRef}
        placeholder={`感谢、鼓励、支持...`}
        value={text}
        onChange={ev => setText(ev.target.value)}
      />
    </FormControl>

    <ButtonGroup>
      {["💖", "👏", "🤗", "🙏", "👍"].map(emoji => <Button
        key={emoji}
        variant="ghost"
        onClick={() => {
          setText(text + emoji);
          fieldRef.current?.focus();        
        }}
      >{emoji}</Button>)}
      <Spacer />
    </ButtonGroup>

    <ButtonGroup width="100%" alignItems="center">
      <Link onClick={() => setIsHistoryOpen(true)}>
        查看所有的赞
      </Link>
      <Spacer />
      <Button variant='outline' onClick={onClose}>
        取消
      </Button>
      <Button
        isDisabled={text.length == 0}
        colorScheme='brand'
        onClick={submit}
        isLoading={isSaving}
      >
        发送
      </Button>
    </ButtonGroup>

    {isHistoryOpen && <UserKudosHistoryModal user={user}
      onClose={() => setIsHistoryOpen(false)}
    />}
  </VStack>;
}

function UserKudosHistoryModal({ user, onClose }: {
  user: MinUser,
  onClose: () => void,
}) {
  const [me] = useUserContext();
  const { data: kudos } = trpcNext.kudos.list.useQuery({ userId: user.id });

  return <ModalWithBackdrop isOpen size="lg" onClose={onClose}>
    <ModalContent>
      <ModalHeader>{formatUserName(user.name, "formal")}收到的赞</ModalHeader>
      <ModalCloseButton />
      <ModalBody>

        {!kudos ? <Loader /> : kudos.length == 0 ?
          <Text>
            {me.id == user.id ? "还没有赞。" :
              `还没有人赞。快去赞一下${formatUserName(user.name, "friendly")}吧！`}
          </Text>
          :
          <KudosHistory kudos={kudos} type="desktop" />
        }
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>关闭</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}

export function KudosHistory({ kudos, type, showReceiver, limit }: { 
  kudos: Kudos[],
  type: "desktop" | "mobile",
  showReceiver?: boolean,
  limit?: number,
}) {
  // Use a state variable to avoid updating it when `markKudosHistoryAsRead`
  // is called.
  const [lastKudosReadAt, setLastKudosReadAt] = useState<moment.Moment>();
  trpcNext.users.getUserState.useQuery(undefined, {
    onSuccess: state => {
      if (!lastKudosReadAt) setLastKudosReadAt(getLastKudosReadAt(state));
    }
  });

  const unread = kudos.filter(k => moment(k.createdAt)
    .isAfter(lastKudosReadAt));
  const read = kudos.filter(k => moment(k.createdAt)
    .isSameOrBefore(lastKudosReadAt));

  const PseudoRow = ({ text, divider }: { text: string, divider?: boolean }) => (
    <GridItem colSpan={2}>
      <Box position='relative' px='10'>
        {divider && <Divider />}
        <AbsoluteCenter bg='white' px='4'>
          <SmallGrayText textAlign="center"
            fontSize={type == "desktop" ? "sm" : "xs"}
          >
            {text}
          </SmallGrayText>
        </AbsoluteCenter>
      </Box>
    </GridItem>
  );

  return <SimpleGrid
    templateColumns="1fr auto"
    gap={type == "desktop" ? componentSpacing * 2 : componentSpacing}
    fontSize={type == "desktop" ? "md" : "sm"}
  >
    {unread.map((k, i) => <KudosHistoryRow
      key={i}
      kudos={k}
      showReceiver={showReceiver}
    />)}

    {read.length > 0 && unread.length > 0 &&
      <PseudoRow divider text={`以上为未读的赞`} />}

    {read.map((k, i) => <KudosHistoryRow
      key={i}
      kudos={k}
      showReceiver={showReceiver}
    />)}

    {limit && <PseudoRow text={`仅显示最近 ${limit} 个赞`} />}
  </SimpleGrid>;
}

function KudosHistoryRow({ kudos, showReceiver }: { 
  kudos: Kudos,
  showReceiver?: boolean
}) {
  const like = kudos.text === null;
  return <>
    <GridItem>
      <Text>
        <UserLink user={kudos.giver} />
        {" "}

        {showReceiver ? <>
          {like ? "给 " : "赞 "}
          <UserLink user={kudos.receiver} />
          {like ? " 点赞 👍" : "："}
        </> : <>
          {like ? " 点赞 👍" : "说："}
        </>}

        {!like && <b>“{kudos.text}”</b>}
      </Text>
    </GridItem>
    <GridItem>
      <SmallGrayText>
        {kudos.createdAt && prettifyDate(kudos.createdAt)}
      </SmallGrayText>
    </GridItem>
  </>;
}

/**
 * The parent element should have position="relative".
 */
export function UnreadKudosRedDot() {
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const { data: newest } = trpcNext.kudos.getNewestKudosCreatedAt.useQuery();
  return <RedDot show={showUnreadKudosRedDot(state, newest)} />;
}

export function showUnreadKudosRedDot(
  userState: UserState | undefined,
  newestKudosCreatedAt: DateColumn | undefined
) {
  return !!userState && !!newestKudosCreatedAt &&
    moment(newestKudosCreatedAt).isAfter(getLastKudosReadAt(userState));
}

function getLastKudosReadAt(state: UserState): moment.Moment {
  // If lastKudosReadAt is absent, treat consentedAt as the last read time.
  // If consentedAt is also absent, then use the current time.
  // `moment(undefined)` returns the current time.
  return moment(state.lastKudosReadAt ?? state.consentedAt);
}

export async function hideUnreadKudosRedDot(
  utils: ReturnType<typeof trpcNext.useContext>,
  newestCreatedAt: DateColumn
) {
  await trpc.users.setUserState.mutate({ lastKudosReadAt: newestCreatedAt });
  await utils.users.getUserState.invalidate();
}
