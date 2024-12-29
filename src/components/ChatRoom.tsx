import {
  Avatar,
  Button,
  HStack,
  Icon,
  Spacer,
  Text,
  Textarea,
  TextareaProps,
  VStack,
  Select,
  StackProps,
  useBreakpointValue,
  Link,
  Kbd
} from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { ChatMessage } from 'shared/ChatMessage';
import { breakpoint, componentSpacing, paragraphSpacing } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import { formatUserName, prettifyDate } from 'shared/strings';
import { MdEdit, MdSend } from 'react-icons/md';
import { AddIcon } from '@chakra-ui/icons';
import invariant from "tiny-invariant";
import Loader from './Loader';
import MarkdownStyler from './MarkdownStyler';
import MarkdownSupport from './MarkdownSupport';
import { compareDate } from 'shared/strings';
import { SmallGrayText } from './SmallGrayText';
import moment, { Moment } from 'moment';
import RedDot, { redDotTransitionProps } from './RedDot';
import { ShowOnDesktop } from './Show';
import Autosaver from './Autosaver';
import { useMyId } from 'useMe';

export default function Room({
  menteeId,
  newMessageButtonLabel = "新消息",
  ...rest
}: {
  menteeId: string,
  newMessageButtonLabel?: string,
} & StackProps) {
  const utils = trpcNext.useContext();

  const { data: room } = trpcNext.chat.getRoom.useQuery({ menteeId });
  const { data: lastReadAt } = trpcNext.chat.getLastReadAt.useQuery({ menteeId });

  const [editing, setEditing] = useState<boolean>(false);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  const markAsRead = useCallback(async () => {
    if (!room || room.messages.length === 0) return;
    const earliest = moment(0);
    // Note that `last` covers all the messages authored by the current user.
    const last = room.messages.reduce((latest, m) => {
      const updatedAt = m.updatedAt ? moment(m.updatedAt) : earliest;
      return moment.max(latest, updatedAt);
    }, earliest);
    await trpc.chat.setLastReadAt.mutate({ menteeId, lastReadAt: last });
    await utils.chat.getLastReadAt.invalidate();
    setHasUnread(false);
  }, [menteeId, room, utils]);

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      if (editing || !hasUnread) return;
      if ((event.key === 'r' || event.key === 'R') && 
        !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        void markAsRead();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => {
      window.removeEventListener('keydown', onKeydown);
    };
  }, [markAsRead, hasUnread, editing]);

  return !room ? <Loader /> : <VStack
    spacing={paragraphSpacing * 1.5}
    align="start"
    maxWidth="800px"
    {...rest}
  >
    {editing ? <Editor
      roomId={room.id}
      onClose={() => setEditing(false)}
      marginTop={componentSpacing}
    />
    :
    <HStack width="100%">
      <Button
        variant="outline"
        leftIcon={<AddIcon />}
        onClick={() => setEditing(true)}
      >
        {newMessageButtonLabel}
      </Button>

      <Spacer />

      <Link
        onClick={markAsRead}
        {...redDotTransitionProps(hasUnread)}
      >
        标为全部已读
      </Link>
      <ShowOnDesktop>
        <Kbd {...redDotTransitionProps(hasUnread)}>R</Kbd>
      </ShowOnDesktop>
    </HStack>}

    {room.messages.sort((a, b) => compareDate(b.createdAt, a.createdAt))
    .map(m => <Message
      key={m.id}
      message={m}
      lastReadAt={moment(lastReadAt)}
      setHasUnread={() => setHasUnread(true)} 
    />)}
  </VStack>;
}

function Message({ message: m, lastReadAt, setHasUnread }: {
  message: ChatMessage,
  lastReadAt: Moment,
  setHasUnread: () => void,
}) {
  const myId = useMyId();
  const name = formatUserName(m.user.name);
  const [editing, setEditing] = useState<boolean>(false);

  const createdAt = m.createdAt ? prettifyDate(m.createdAt) : "";
  const updatedAt = m.updatedAt ? prettifyDate(m.updatedAt) : "";

  // Do not show update time if the formatted text is the same as created time.
  const updatedAtText = useBreakpointValue({
      base: updatedAt !== createdAt ? <><br />{updatedAt}更新</> : <></>  ,
      [breakpoint]: updatedAt !== createdAt ? <> ｜ {updatedAt}更新</> : <></>,
  });

  const unread = m.user.id !== myId && moment(m.updatedAt).isAfter(lastReadAt);
  useEffect(() => { if (unread) setHasUnread(); }, [setHasUnread, unread]);

  return <HStack align="top" spacing={componentSpacing} width="100%">
    <Avatar name={name} boxSize={10} />
    <VStack align="start" width="100%">
      <HStack minWidth="210px" spacing={componentSpacing}>
        {/* flexShrink is to prevent the name from being squished */}
        <Text flexShrink={0}>{name}</Text>

        <SmallGrayText position="relative">
          {createdAt}创建
          {updatedAtText}
          <RedDot show={unread} />
        </SmallGrayText>

        {!editing && myId == m.user.id && <>
          <Spacer />
          <Icon as={MdEdit} cursor="pointer" onClick={() => setEditing(true)} />
        </>}
      </HStack>

      {editing ? <Editor message={m} onClose={() => setEditing(false)} /> :
        <MarkdownStyler content={m.markdown} />}
    </VStack>
  </HStack>;
}

export const mentorMeetingMessagePrefix = "【导师交流】";

function Editor({ roomId, message, onClose, ...rest }: {
  // if specified, create a new message
  roomId?: string,
  // must be specified if and only if roomId is undefined
  message?: ChatMessage,
  onClose: Function,
} & TextareaProps) {
  const [markdown, setMarkdown] = useState<string>();

  const { data: draft } = trpcNext.chat.getDraftMessage.useQuery({
    roomId, messageId: message?.id,
  });
  useEffect(() => {
    if (markdown === undefined && draft !== undefined) {
      setMarkdown(draft !== null ? draft : message?.markdown ?? "");
    }
  }, [draft, message?.markdown, markdown]);

  const [saving, setSaving] = useState<boolean>(false);
  const utils = trpcNext.useContext();
  
  const insertPrefix = (prefix: string) => {
    setMarkdown(prev => prefix + prev);
  };

  const save = useCallback(async () => {
    invariant(markdown);
    setSaving(true);
    try {
      if (message) {
        invariant(!roomId);
        await trpc.chat.updateMessage.mutate({ messageId: message.id, markdown });
      } else {
        invariant(roomId);
        await trpc.chat.createMessage.mutate({ roomId, markdown });
      }
      await utils.chat.getRoom.invalidate();
      // The draft is deleted in the backend.
      await utils.chat.getDraftMessage.invalidate();
      onClose();
    } finally {
      setSaving(false);
    }
  }, [markdown, message, utils.chat.getRoom, utils.chat.getDraftMessage,
    onClose, roomId]);

  const saveDraft = useCallback(async (markdown: string) => {
    await trpc.chat.saveDraftMessage.mutate({
      roomId, messageId: message?.id, markdown
    });
    await utils.chat.getDraftMessage.invalidate();
  }, [message?.id, roomId, utils.chat.getDraftMessage]);

  const prefixes = [
    "【一对一】",
    mentorMeetingMessagePrefix,
  ];
  
  return <>
    <Textarea
      value={markdown === undefined ? "" : markdown}
      // Waiting for the draft to be fetched. Do not do it because it will
      // mess up with autoFocus. Find a better solution maybe?
      // disabled={markdown === undefined}
      onChange={e => setMarkdown(e.target.value)}
      background="white" height={200}
      placeholder={markdown === undefined ? "加载草稿中..." : "（草稿自动保存）"}
      autoFocus
      {...rest}
    />

    <Autosaver data={markdown} onSave={saveDraft} />

    <HStack width="100%" spacing={componentSpacing}>
      <Button onClick={save} isLoading={saving} isDisabled={!markdown}
        variant="brand" leftIcon={<Icon as={MdSend} />}
        display={{ base: "none", [breakpoint]: "flex" }}
      >
        确认
      </Button>

      <Button onClick={save} isLoading={saving} isDisabled={!markdown}
        variant="brand"
        display={{ base: "flex", [breakpoint]: "none" }}
      >
        确认
      </Button>

      <Button onClick={() => onClose()} variant="ghost" color="gray">
        取消
      </Button>

      <Spacer />

      {/* Hide on narrow screen due to limited space */}
      <MarkdownSupport
        fontSize="sm"
        display={{ base: "none", "2xl": "block" }} 
      />

      <Select placeholder="笔记分类"
        onChange={e => insertPrefix(e.target.value)}
        // if maxWidth is not specified, it will take up all the remaining width.
        // this must work with Spacer to create a gap.
        maxWidth="150px"
      >
        {prefixes.map(p => <option key={p} value={p}>{p}</option>)}
      </Select>
    </HStack>
  </>;
}

/**
 * @returns whether there are unread messages in any of the specified chat rooms.
 */
export function useUnreadChatMessages(menteeIds: string[]) {
  const lastReads = trpcNext.useQueries(t => {
    return menteeIds.map(id => t.chat.getLastReadAt({ menteeId: id }));
  });
  const lastUpdates = trpcNext.useQueries(t => {
    return menteeIds.map(id => t.chat.getLastMessageUpdatedAt({ menteeId: id }));
  });
  invariant(lastReads.length === lastUpdates.length);

  return lastReads.some((res, i) => {
    const lastRead = res.data;
    const lastUpdated = lastUpdates[i].data;

    // Assume no unread message while the values are being fetched.
    return lastRead !== undefined && lastUpdated !== undefined &&
      // lastUpdated is null if there is no message.
      lastUpdated !== null && moment(lastUpdated).isAfter(lastRead);
  });
}

/**
 * The parent element should have position="relative".
 */
export function UnreadChatMessagesRedDot({ menteeId }: { menteeId: string }) {
  const show = useUnreadChatMessages([menteeId]);
  return <RedDot show={show} />;
}

