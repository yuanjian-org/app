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
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { ChatMessage } from 'shared/ChatMessage';
import { breakpoint, componentSpacing, paragraphSpacing } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import { formatUserName, prettifyDate } from 'shared/strings';
import { MdEdit, MdSend } from 'react-icons/md';
import { useUserContext } from 'UserContext';
import { AddIcon } from '@chakra-ui/icons';
import invariant from "tiny-invariant";
import Loader from './Loader';
import MarkdownStyler from './MarkdownStyler';
import MarkdownSupport from './MarkdownSupport';
import { compareDate } from 'shared/strings';

export default function Room({
  menteeId,
  newMessageButtonLabel = "新消息",
  ...rest
}: {
  menteeId: string,
  newMessageButtonLabel?: string,
} & StackProps) {
  const { data: room } = trpcNext.chat.getRoom.useQuery({ menteeId });

  return !room ? <Loader /> :
    <VStack
      spacing={paragraphSpacing * 1.5}
      align="start"
      maxWidth="800px"
      {...rest}
    >
      <MessageCreator
        roomId={room.id}
        newMessageButtonLabel={newMessageButtonLabel}
      />
      {room.messages.sort((a, b) => compareDate(b.createdAt, a.createdAt))
      .map(m => <Message key={m.id} message={m} />)}
    </VStack>
    ;
}

function MessageCreator({ roomId, newMessageButtonLabel }: {
  roomId: string,
  newMessageButtonLabel: string,
}) {
  const [editing, setEditing] = useState<boolean>(false);

  return editing ?
    <Editor roomId={roomId} onClose={() => setEditing(false)}
      marginTop={componentSpacing} />
    :
    <Button variant="outline" leftIcon={<AddIcon />}
      onClick={() => setEditing(true)}>{newMessageButtonLabel}</Button>;
}

function Message({ message: m }: {
  message: ChatMessage,
}) {
  const [user] = useUserContext();
  const name = formatUserName(m.user.name);
  const [editing, setEditing] = useState<boolean>(false);

  const createdAt = m.createdAt ? `${prettifyDate(m.createdAt)}` : "";
  const updatedAt = m.updatedAt && m.updatedAt !== m.createdAt ?
    `${prettifyDate(m.updatedAt)}` : "";

  return <HStack align="top" spacing={componentSpacing} width="100%">
    <Avatar name={name} boxSize={10} />
    <VStack align="start" width="100%">
      <HStack minWidth="210px" spacing={componentSpacing}>
        {/* flexShrink is to prevent the name from being squished */}
        <Text flexShrink={0}>{name}</Text>

        {/* This is for desktop */}
        <Text
          display={{ base: "none", [breakpoint]: "block" }}
          fontSize="sm"
          color="grey"
        >
          {createdAt}创建
          {updatedAt && updatedAt !== createdAt && ` ｜ ${updatedAt}更新`}
        </Text>

        {/* This is for mobile */}
        <Text
          display={{ base: "block", [breakpoint]: "none" }}
          fontSize="sm"
          color="grey"
        >
          {createdAt}创建
          {updatedAt && updatedAt !== createdAt && <><br />{updatedAt}更新</>}
        </Text>

        {!editing && user.id == m.user.id && <>
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
  const [markdown, setMarkdown] = useState<string>(
    message ? message.markdown : "");
  const [saving, setSaving] = useState<boolean>(false);
  const utils = trpcNext.useContext();
  
  const insertPrefix = (prefix: string) => {
    setMarkdown(prev => prefix + prev);
  };

  const save = async () => {
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
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const prefixes = [
    "【一对一】",
    mentorMeetingMessagePrefix,
  ];
  
  return <>
    <Textarea value={markdown} onChange={e => setMarkdown(e.target.value)}
      autoFocus background="white" height={200} {...rest}
    />

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

      <Button onClick={() => onClose()} variant="ghost" color="grey">
        取消
      </Button>

      <Spacer />

      {/* Hide on mobile due to limited space */}
      <MarkdownSupport
        fontSize="sm"
        display={{ base: "none", [breakpoint]: "block" }} 
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
