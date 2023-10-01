import {
  Avatar,
  Button,
  HStack,
  Icon,
  IconButton,
  Spacer,
  Text,
  Textarea,
  TextareaProps,
  VStack,
} from '@chakra-ui/react';
import React, { useState } from 'react';
import { ChatMessage } from 'shared/ChatMessage';
import { componentSpacing, paragraphSpacing } from 'theme/metrics';
import trpc, { trpcNext } from 'trpc';
import { formatUserName, prettifyDate } from 'shared/strings';
import moment from 'moment';
import ReactMarkdown from 'react-markdown';
import { MdEdit } from 'react-icons/md';
import { useUserContext } from 'UserContext';
import { AddIcon } from '@chakra-ui/icons';
import invariant from "tiny-invariant";
import Loader from './Loader';

export default function Room({ mentorshipId } : {
  mentorshipId: string,
}) {
  const { data: room } = trpcNext.chat.getRoom.useQuery({ mentorshipId });

  return !room ? <Loader /> : <VStack spacing={paragraphSpacing * 1.5} align="start">
    {!room.messages.length && <Text color="grey">无讨论内容。点击按钮添加：</Text>}

    <MessageCreator roomId={room.id} />

    {room.messages.sort((a, b) => moment(a.updatedAt).isAfter(moment(b.updatedAt)) ? -1 : 1)
      .map(m => <Message key={m.id} message={m} />)
    }
  </VStack>;
}

function MessageCreator({ roomId }: {
  roomId: string,
}) {
  const [editing, setEditing] = useState<boolean>(false);

  return editing ? <Editor roomId={roomId} onClose={() => setEditing(false)} marginTop={componentSpacing} /> : 
    <IconButton variant="outline" icon={<AddIcon />} onClick={() => setEditing(true)} aria-label="新消息" />;
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
          {m.updatedAt && prettifyDate(m.updatedAt)}
          {m.updatedAt !== m.createdAt && "更新"}
        </Text>

        {!editing && user.id == m.user.id && <>
          <Spacer />
          <Icon as={MdEdit} cursor="pointer" onClick={() => setEditing(true)} />
        </>}
      </HStack>

      {editing ? <Editor message={m} onClose={() => setEditing(false)} /> : <ReactMarkdown>{m.markdown}</ReactMarkdown>}
    </VStack>
  </HStack>;
}

function Editor({ roomId, message, onClose, ...rest }: {
  roomId?: string,        // create a new message when specified
  message?: ChatMessage,  // must be specified iff. roomId is undefined
  onClose: Function,
} & TextareaProps) {
  const [markdown, setMarkdown] = useState<string>(message ? message.markdown : "");
  const [saving, setSaving] = useState<boolean>(false);
  const utils = trpcNext.useContext();

  const save = async () => {
    setSaving(true);
    try {
      if (message) {
        invariant(!roomId);
        await trpc.chat.updaateMessage.mutate({ messageId: message.id, markdown });
      } else {
        invariant(roomId);
        await trpc.chat.createMessage.mutate({ roomId, markdown });
      }
      utils.chat.getRoom.invalidate();
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
      <Button onClick={save} isLoading={saving} isDisabled={!markdown} variant="brand">{roomId ? "添加" : "更新"}</Button>
      <Button onClick={() => onClose()} variant="ghost">取消</Button>
    </HStack>
  </>;
}