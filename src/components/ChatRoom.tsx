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
  Flex,
} from '@chakra-ui/react';
import React, { useState, useRef } from 'react';
import { sidebarBreakpoint } from 'components/Navbars';
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
    <VStack spacing={paragraphSpacing * 1.5} align="start" maxWidth="800px">
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
  // To resolve TS type issues with the direction prop in Chakra UI, 
  // explicitly declare each value using as const to ensure correct typing.
  const direction = { base: "column" as const, [sidebarBreakpoint]: "row" as const };
  const mobileGap = 2;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = (markdown: string, cursorPos: number, snippet: string) => 
  {
    const before = markdown.substring(0, cursorPos);
    const after = markdown.substring(cursorPos);
    return before + snippet + after;
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
   
    const cursorPos = textarea.selectionStart; 
    const snippet = snippets.find(snippet => 
      snippet.text === e.target.value)?.text ?? '';
    const updatedMarkdown = insertSnippet(markdown, cursorPos, snippet);
      setMarkdown(updatedMarkdown); 
    // Set timeout to ensure the textarea updates before moving the cursor
    setTimeout(() => {
      const newCursorPos = cursorPos + snippet.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus(); 
    }, 0);
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
    <Textarea ref={textareaRef} value={markdown} 
      onChange={e => setMarkdown(e.target.value)}
      autoFocus background="white" height={200} {...rest}
    />

    <Flex direction={direction} width="100%" gap={mobileGap}>
      <Flex align="center" gap={componentSpacing} justifyContent="left">
        <Button onClick={save} isLoading={saving} isDisabled={!markdown}
          variant="brand" leftIcon={<Icon as={MdSend} />}>确认</Button>
        <Button onClick={() => onClose()} variant="ghost" color="grey">
          取消</Button>
      </Flex>
      <Spacer />
      <Flex align="center" gap={componentSpacing} justifyContent="right">
        <Link target="_blank" 
          href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax" 
        >
          <HStack>
            <Text>支持 Markdown 格式</Text>
            <Icon as={ExternalLinkIcon} />
          </HStack>
        </Link>
        <Select value="" placeholder="模版文字" onChange={handleSelectChange} 
          // if maxWidth is not specified, it will take up all the remaining width.
          // this must work with Spacer to create a gap.
          maxWidth="180px" 
        >
          {snippets.map((snippet, index) => (
            <option key={index} value={snippet.title}>{snippet.title}</option>
          ))}
        </Select>
      </Flex>
    </Flex>
  </>;
}
