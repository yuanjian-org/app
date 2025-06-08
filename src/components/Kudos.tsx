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
import { useState, useRef, useCallback } from 'react';
import trpc, { trpcNext } from 'trpc';
import FocusLock from "react-focus-lock";
import { toast } from 'react-toastify';
import ModalWithBackdrop from './ModalWithBackdrop';
import { Kudos } from 'shared/Kudos';
import Loader from './Loader';
import { UserLink } from './UserChip';
import moment, { Moment } from 'moment';
import { SmallGrayText } from './SmallGrayText';
import { DateColumn } from 'shared/DateColumn';
import { UserState } from 'shared/UserState';
import RedDot from './RedDot';
import { motion, AnimatePresence } from 'framer-motion';
import useMe, { useMyId, useMyRoles } from 'useMe';
import { isPermitted } from 'shared/Role';

export function KudosControl({ user, likes, kudos }: {
  user: MinUser,
  likes: number,
  kudos: number,
}) {
  const myId = useMyId();
  const name = formatUserName(user.name, "friendly");

  // This variable allows local update without waiting for server response.
  const [localLikes, setLocalLikes] = useState<number>(likes);
  const [localKudos, setLocalKudos] = useState<number>(kudos);
  const [popoverTitle, setPopoverTitle] = useState<string>("");
  const [showPlusOneAnime, setShowPlusOneAnime] = useState(false);

  const popoverInputRef = useRef<HTMLInputElement>(null);
  const {
    onOpen: onOpenPopover,
    onClose: onClosePopover,
    isOpen: isPopoverOpen
  } = useDisclosure();

  const animeDurationInSeconds = 2;
  const saveLike = useCallback(async () => {
    setLocalLikes(localLikes + 1);
    setShowPlusOneAnime(true);
    setTimeout(() => setShowPlusOneAnime(false), animeDurationInSeconds * 1000);
    setPopoverTitle(`感谢点赞！要不要再给${name}留个言？（可选）`);
    onOpenPopover();
    await trpc.kudos.create.mutate({ userId: user.id, text: null });
  }, [localLikes, name, onOpenPopover, user.id]);

  const saveKudos = async (text: string) => {
    setLocalKudos(localKudos + 1);
    await trpc.kudos.create.mutate({ userId: user.id, text });
  };

  return myId == user.id ? <MyKudosControl likes={likes} kudos={kudos} /> : <>
    <Tooltip
      label={`点赞后，${name}会收到Email哦`}
      placement="top"
    >
      <Box position="relative" display="flex" alignItems="center">
        <Text
          display="flex"
          alignItems="center"
          color="orange.600"
          cursor="pointer"
          onClick={saveLike}
        >
          👍{localLikes > 0 && ` ${localLikes}`}
        </Text>

        <AnimatePresence>
          {showPlusOneAnime && (
            <motion.div
              initial={{ opacity: 1, x: -25, y: 0 }}
              animate={{ opacity: 0, x: -25, y: -100 }}
              exit={{ opacity: 0 }}
              transition={{ duration: animeDurationInSeconds }}
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '3em',
                fontWeight: 'bold',
                color: 'orange',
                pointerEvents: 'none',
                // Make it above the popover
                zIndex: 1000,
              }}
            >
              +1
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
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
  const me = useMe();
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
  const myId = useMyId();
  const { data: kudos } = trpcNext.kudos.list.useQuery({ userId: user.id });

  return <ModalWithBackdrop isOpen size="lg" onClose={onClose}>
    <ModalContent>
      <ModalHeader>{formatUserName(user.name, "formal")}收到的赞</ModalHeader>
      <ModalCloseButton />
      <ModalBody>

        {!kudos ? <Loader /> : kudos.length == 0 ?
          <Text>
            {myId == user.id ? "还没有赞。" :
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

export function KudosHistory({ kudos, type, showReceiver, showPseudoRows,
  showLimit
}: { 
  kudos: Kudos[],
  type: "desktop" | "mobile",
  showPseudoRows?: boolean,
  showReceiver?: boolean,
  // Valid only when `showPseudoRows` is also true.
  showLimit?: number,
}) {
  // Use a state variable to avoid updating it when `markKudosAsRead` is called.
  const [lastKudosReadAt, setLastKudosReadAt] = useState<Moment>();
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

    {showPseudoRows && read.length > 0 && unread.length > 0 &&
      <PseudoRow divider text={`以上为未读的赞`} />}

    {read.map((k, i) => <KudosHistoryRow
      key={i}
      kudos={k}
      showReceiver={showReceiver}
    />)}

    {showPseudoRows && showLimit &&
      <PseudoRow text={`仅显示最近 ${showLimit} 个赞`} />}

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

        {!like && <i>“{kudos.text}”</i>}
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
 * TODO: The following functions are very similar to the ones in TasksCard.tsx.
 * Consider refactoring them to be shared.
 */

function getLastKudosReadAt(state: UserState): Moment {
  // If lastKudosReadAt is absent, treat consentedAt as the last read time.
  // If consentedAt is also absent, then use the current time.
  // `moment(undefined)` returns the current time.
  return moment(state.lastKudosReadAt ?? state.consentedAt);
}

/**
 * The parent element should have position="relative".
 */
export function UnreadKudosRedDot() {
  const show = useUnreadKudos();
  return <RedDot show={show} />;
}

/**
 * @returns whether there are unread kudos.
 */
export function useUnreadKudos() {
  const myRoles = useMyRoles();
  const { data: state } = trpcNext.users.getUserState.useQuery();
  const { data: lastCreated } = trpcNext.kudos.getLastKudosCreatedAt.useQuery();

  // Check permission after all hooks are called
  if (!isPermitted(myRoles, "Volunteer")) return false;

  // Assume no unread kudos while the values are being fetched.
  return !!state && !!lastCreated &&
    moment(lastCreated).isAfter(getLastKudosReadAt(state));
}

export async function markKudosAsRead(
  utils: ReturnType<typeof trpcNext.useContext>,
  lastKudosReadAt: DateColumn
) {
  await trpc.users.setUserState.mutate({ lastKudosReadAt });
  await utils.users.getUserState.invalidate();
}
