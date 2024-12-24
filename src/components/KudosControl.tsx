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
  ModalCloseButton
} from '@chakra-ui/react';
import { formatUserName, prettifyDate } from 'shared/strings';
import { componentSpacing } from 'theme/metrics';
import { getUserUrl, MinUser } from 'shared/User';
import { useState, useRef } from 'react';
import trpc, { trpcNext } from 'trpc';
import { useUserContext } from 'UserContext';
import FocusLock from "react-focus-lock";
import { toast } from 'react-toastify';
import ModalWithBackdrop from './ModalWithBackdrop';
import { Kudos } from 'shared/Kudos';
import NextLink from 'next/link';
import Loader from './Loader';

export default function KudosControl({ user, likes, kudos }: {
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
        <PopoverContent width="350px" boxShadow="lg">
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

    {isHistoryOpen && <KudosHistoryModal user={me}
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
      {["💖", "👏", "🎉", "🤗", "🙏", "👍"].map(emoji => <Button
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

    {isHistoryOpen && <KudosHistoryModal user={user}
      onClose={() => setIsHistoryOpen(false)}
    />}
  </VStack>;
}

function KudosHistoryModal({ user, onClose }: {
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
          <SimpleGrid
            templateColumns="1fr auto"
            gap={componentSpacing}
          >
            {kudos?.map((k, i) => <KudosRow key={i} kudos={k} />)}
          </SimpleGrid>
        }
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>关闭</Button>
      </ModalFooter>
    </ModalContent>
  </ModalWithBackdrop>;
}

function KudosRow({ kudos }: { kudos: Kudos }) {
  const like = kudos.text === null;
  return <>
    <GridItem>
      <Text>
        <Link as={NextLink} href={getUserUrl(kudos.giver)} target="_blank">
          {formatUserName(kudos.giver.name, "formal")}
        </Link>
        {like ? "点赞 👍" : "说："}
        {!like && <b>“{kudos.text}”</b>}
      </Text>
    </GridItem>
    <GridItem>
      <Text fontSize="sm" color="gray.500">
        {kudos.createdAt && prettifyDate(kudos.createdAt)}
      </Text>
    </GridItem>
  </>;
}
