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
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { ChatMessage } from 'shared/ChatMessage';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import { formatUserName, prettifyDate } from 'shared/strings';
import moment from 'moment';
import { MdEdit, MdSend } from 'react-icons/md';
import { useUserContext } from 'UserContext';
import { AddIcon } from '@chakra-ui/icons';
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
    title: "辅导难题解决策略",
    text: '在本次辅导中，【学生姓名】提到了在【课程或技能】上遇到的难题，尤其是【具体问题】。' +
    '我给出了一些解决策略，包括【策略1】和【策略2】，希望能帮助他/她在下次作业中表现更好。' +
    '为了进一步提升他/她的理解和技能，我推荐他/她阅读【推荐资料或活动】。'
  },
  {
    title: "专注技能提升",
    text: '今天我们重点关注了【学生姓名】的【具体技能或课程内容】。' +
    '他/她对于【具体问题或挑战】的处理方式是【描述】，我建议他/她在未来可以尝试【具体建议】。'
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
    setMarkdown(prev => prev + snippet + '\n');
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

    <HStack>
      <Select placeholder="选择模版" 
        onChange={(e) => insertSnippet(snippets.find(snippet => 
          snippet.title === e.target.value)?.text || "")} 
        width="180px" marginRight={10} variant="brand">
        {snippets.map((snippet, index) => (
          <option key={index} value={snippet.title}>{snippet.title}</option>
        ))}
      </Select>

      <Button onClick={save} isLoading={saving} isDisabled={!markdown}
        variant="brand" leftIcon={<Icon as={MdSend} />}
      >
        确认
      </Button>
      <Button onClick={() => onClose()} variant="ghost" color="grey">取消</Button>
    </HStack>
  </>;
}
