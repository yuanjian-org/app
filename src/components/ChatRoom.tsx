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
  Link,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { ChatMessage } from 'shared/ChatMessage';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import { formatUserName, prettifyDate } from 'shared/strings';
import moment from 'moment';
import { MdEdit, MdSend } from 'react-icons/md';
import { useUserContext } from 'UserContext';
import { AddIcon, ExternalLinkIcon } from '@chakra-ui/icons';
import invariant from "tiny-invariant";
import Loader from './Loader';
import MarkdownStyler from './MarkdownStyler';

export default function Room({ menteeId }: {
  menteeId: string,
}) {
  const { data: room } = trpcNext.chat.getRoom.useQuery({ menteeId });

  return !room ? <Loader /> :
    <VStack spacing={paragraphSpacing * 1.5} align="start">
      <MessageCreator roomId={room.id} />

      {room.messages.sort((a, b) => moment(a.updatedAt)
        .isAfter(moment(b.updatedAt)) ? -1 : 1)
        .map(m => <Message key={m.id} message={m} />)
      }
    </VStack>
    ;
}

function MessageCreator({ roomId }: {
  roomId: string,
}) {
  const [editing, setEditing] = useState<boolean>(false);

  return editing ?
    <Editor roomId={roomId} onClose={() => setEditing(false)}
      marginTop={componentSpacing} />
    :
    <Button variant="outline" leftIcon={<AddIcon />}
      onClick={() => setEditing(true)}>新消息</Button>;
}

function Message({ message: m }: {
  message: ChatMessage,
}) {
  const [user] = useUserContext();
  const name = formatUserName(m.user.name);
  const [editing, setEditing] = useState<boolean>(false);

  return <HStack align="top" spacing={componentSpacing} width="100%">
    <Avatar name={name} boxSize={10} />
    <VStack align="start" width="100%">
      <HStack minWidth="210px" spacing={componentSpacing}>
        <Text>{name}</Text>
        <Text color="grey">
          {m.createdAt && `${prettifyDate(m.createdAt)}创建`}
          {m.updatedAt && m.updatedAt !== m.createdAt && ` ｜ ${prettifyDate(m.updatedAt)}更新`}
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

const snippets = [
  {
    title: "【一对一】",
    text: "【一对一】"
  },
  {
    title: "【导师组内部讨论】",
    text: "【导师组内部讨论】"
  }
];

function Editor({ roomId, message, onClose, ...rest }: {
  roomId?: string,        // create a new message when specified
  message?: ChatMessage,  // must be specified iff. roomId is undefined
  onClose: Function,
} & TextareaProps) {
  const [markdown, setMarkdown] = useState<string>(
    message ? message.markdown : "");
  const [saving, setSaving] = useState<boolean>(false);
  const utils = trpcNext.useContext();
  
  const insertSnippet = (snippet: string) => {
    setMarkdown(prev => prev + snippet);
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

  return <>
    <Textarea value={markdown} onChange={e => setMarkdown(e.target.value)}
      autoFocus background="white" height={200} {...rest}
    />

    <HStack width="100%" spacing={componentSpacing}>
      <Button onClick={save} isLoading={saving} isDisabled={!markdown}
        variant="brand" leftIcon={<Icon as={MdSend} />}
      >
        确认
      </Button>
      <Button onClick={() => onClose()} variant="ghost" color="grey">取消</Button>
      <Spacer />

      <Link target="_blank" 
        href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax" 
      >
        <HStack>
          <Text>支持 Markdown 格式</Text>
          <Icon as={ExternalLinkIcon} />
        </HStack>
      </Link>

      <Select placeholder="模版文字"
        onChange={e => insertSnippet(snippets.find(snippet => 
          snippet.title === e.target.value)?.text || "")} 
          // if maxWidth is not specified, it will take up all the remaining width.
          // this must work with Spacer to create a gap.
          maxWidth="180px" 
      >
        {snippets.map((snippet, index) => (
          <option key={index} value={snippet.title}>{snippet.title}</option>
        ))}
      </Select>
    </HStack>
  </>;
}
