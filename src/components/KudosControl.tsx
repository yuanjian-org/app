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

  const saveLike = async () => {
    setLocalLikes(localLikes + 1);
    await trpc.kudos.create.mutate({ userId: user.id, text: null });
  };

  const saveKudos = async (text: string) => {
    setLocalKudos(localKudos + 1);
    await trpc.kudos.create.mutate({ userId: user.id, text });
  };

  const { onOpen, onClose, isOpen } = useDisclosure();
  const fieldRef = useRef<HTMLInputElement>(null);

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
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      initialFocusRef={fieldRef}
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
            {/* For some reason the close button doesn't work. */}
            {/* <PopoverCloseButton /> */}
            <PopoverBody>
              <KudosForm
                user={user}
                fieldRef={fieldRef}
                save={saveKudos}
                onClose={onClose}
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

function KudosForm({ user, fieldRef, save, onClose }: {
  user: MinUser,
  fieldRef: React.RefObject<HTMLInputElement>,
  save: (text: string) => Promise<void>,
  onClose: () => void,
}) {
  const name = formatUserName(user.name, "friendly");

  const [text, setText] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const submit = async () => {
    setIsSaving(true);
    try {
      await save(text);
      toast.success("感谢你的夸夸！");
      setText("");
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return <VStack spacing={componentSpacing}>
    <FormControl>
      <FormLabel>夸夸{name}</FormLabel>
      <Input
        ref={fieldRef}
        placeholder={`感谢、鼓励、支持...`}
        value={text}
        onChange={ev => setText(ev.target.value)}
      />
    </FormControl>

    <ButtonGroup>
      {["💖", "👏", "🎉", "🤗", "🙏"].map(emoji => <Button
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
        查看所有夸夸
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
        保存
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
      <ModalHeader>{formatUserName(user.name, "formal")}收到的夸夸</ModalHeader>
      <ModalCloseButton />
      <ModalBody>

        {!kudos ? <Loader /> : kudos.length == 0 ?
          <Text>
            {me.id == user.id ? "还没有夸夸。" :
              `还没有人夸。快去夸夸${formatUserName(user.name, "friendly")}吧！`}
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
